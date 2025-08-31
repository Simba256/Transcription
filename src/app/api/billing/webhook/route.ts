import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (error: unknown) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log('Payment succeeded:', paymentIntent.id);
        
        const userId = paymentIntent.metadata.userId;
        const credits = parseInt(paymentIntent.metadata.credits);
        const packageId = paymentIntent.metadata.packageId;

        if (!userId || !credits || !packageId) {
          console.error('Missing metadata in payment intent:', paymentIntent.metadata);
          break;
        }

        try {
          // Update user credits in Firestore
          const userRef = adminDb.collection('users').doc(userId);
          
          await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            
            if (!userDoc.exists) {
              console.error('User document not found:', userId);
              return;
            }

            const userData = userDoc.data();
            const currentCredits = userData?.credits || 0;
            const newCredits = currentCredits + credits;

            // Update user credits
            transaction.update(userRef, {
              credits: newCredits,
              updatedAt: FieldValue.serverTimestamp(),
            });

            // Create transaction record (check if it doesn't already exist)
            const existingTransactionQuery = await adminDb
              .collection('creditTransactions')
              .where('paymentIntentId', '==', paymentIntent.id)
              .get();

            if (existingTransactionQuery.empty) {
              const transactionRef = adminDb.collection('creditTransactions').doc();
              transaction.set(transactionRef, {
                userId,
                type: 'purchase',
                amount: credits,
                description: `Purchased ${packageId} package - ${credits} credits for $${(paymentIntent.amount / 100).toFixed(2)} CAD`,
                date: FieldValue.serverTimestamp(),
                paymentIntentId: paymentIntent.id,
                packageId,
                status: 'completed',
              });
            }
          });

          console.log(`Credits updated for user ${userId}: +${credits}`);
        } catch (error) {
          console.error('Error updating credits:', error);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        
        // Optionally log failed payments or send notifications
        const userId = paymentIntent.metadata.userId;
        if (userId) {
          // Could create a failed transaction record or send notification
          console.log(`Payment failed for user: ${userId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}