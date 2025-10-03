import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

export async function POST(request: NextRequest) {
  console.log('[WEBHOOK] Received webhook request');

  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    console.log('[WEBHOOK] Signature:', sig ? 'present' : 'missing');
    console.log('[WEBHOOK] Webhook secret:', webhookSecret.substring(0, 10) + '...');

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log('[WEBHOOK] Event type:', event.type);
    } catch (error: unknown) {
      console.error('[WEBHOOK] Signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('Checkout session completed:', session.id);

        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          console.error('Missing metadata in checkout session:', session.metadata);
          break;
        }

        try {
          // Import createSubscription here to avoid circular dependencies
          const { createSubscription } = await import('@/lib/services/subscription.service');

          // Get user data for email
          const userDoc = await adminDb.collection('users').doc(userId).get();
          if (!userDoc.exists) {
            console.error('User document not found:', userId);
            break;
          }

          const userData = userDoc.data();
          const email = userData?.email;
          const name = userData?.displayName || userData?.name;

          if (!email) {
            console.error('User email not found:', userId);
            break;
          }

          // The subscription is already created by Stripe during checkout
          // We need to sync it to our database
          const stripeSubscriptionId = session.subscription as string;

          if (!stripeSubscriptionId) {
            console.error('No subscription ID in checkout session');
            break;
          }

          // Retrieve the subscription from Stripe with expanded data
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
            expand: ['latest_invoice', 'customer']
          });

          console.log('Stripe subscription retrieved:', {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            current_period_start: stripeSubscription.current_period_start,
            current_period_end: stripeSubscription.current_period_end,
            trial_start: stripeSubscription.trial_start,
            trial_end: stripeSubscription.trial_end
          });

          // Create subscription in our database using the existing Stripe subscription
          const { createSubscriptionFromStripe } = await import('@/lib/services/subscription.service');
          await createSubscriptionFromStripe(userId, stripeSubscription);

          console.log(`Subscription created for user ${userId}: ${planId}`);
        } catch (error) {
          console.error('Error creating subscription:', error);
        }
        break;
      }

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