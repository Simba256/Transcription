import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// SECURITY: Require webhook secret in production
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not configured. This is required for webhook security.');
}

export async function POST(request: NextRequest) {
  console.log('[WEBHOOK] Received webhook request at:', new Date().toISOString());

  // Enhanced environment check for debugging
  console.log('[WEBHOOK] Environment check:', {
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV,
    url: request.url,
  });

  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      console.error('[WEBHOOK] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    console.log('[WEBHOOK] Signature present, attempting verification...');

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log('[WEBHOOK] ✅ Signature verified successfully');
      console.log('[WEBHOOK] Event:', {
        type: event.type,
        id: event.id,
        created: new Date(event.created * 1000).toISOString(),
      });
    } catch (error: unknown) {
      console.error('[WEBHOOK] ❌ Signature verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookSecretPresent: !!webhookSecret,
        signaturePresent: !!sig,
      });
      return NextResponse.json(
        { error: 'Invalid signature - check STRIPE_WEBHOOK_SECRET in Vercel' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('[WEBHOOK] Processing checkout.session.completed:', {
          sessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        });

        const userId = session.metadata?.userId;
        const paymentType = session.metadata?.type || 'package'; // Default to package
        const amount = (session.amount_total || 0) / 100; // Convert cents to dollars

        if (!userId) {
          console.error('[WEBHOOK] ❌ Missing userId in checkout session metadata:', {
            metadata: session.metadata,
            sessionId: session.id,
            customerEmail: session.customer_email,
          });
          // Try to find user by email as fallback
          if (session.customer_email) {
            console.log('[WEBHOOK] Attempting to find user by email:', session.customer_email);
          }
          break;
        }

        console.log('[WEBHOOK] Processing payment for user:', {
          userId,
          paymentType,
          amount: `CA$${amount.toFixed(2)}`,
        });

        try {
          const userRef = adminDb.collection('users').doc(userId);

          await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
              console.error('User document not found:', userId);
              return;
            }

            const userData = userDoc.data();

            if (paymentType === 'package') {
              // Handle package purchase from pricing table
              const packageType = session.metadata?.packageType;
              const packageMinutes = parseInt(session.metadata?.packageMinutes || '0');
              const packageRate = parseFloat(session.metadata?.packageRate || '0');
              const packageName = session.metadata?.packageName;

              if (!packageType || !packageMinutes || !packageRate) {
                console.error('Missing package metadata in checkout session:', session.metadata);
                return;
              }

              // Create package object
              const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const now = new Date();
              const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

              const newPackage = {
                id: packageId,
                type: packageType,
                name: packageName || `${packageType.charAt(0).toUpperCase() + packageType.slice(1)} Package`,
                minutesTotal: packageMinutes,
                minutesUsed: 0,
                minutesRemaining: packageMinutes,
                rate: packageRate,
                purchasedAt: now,
                expiresAt: expiresAt,
                active: true
              };

              // Update user with new package
              const currentPackages = userData?.packages || [];
              transaction.update(userRef, {
                packages: [...currentPackages, newPackage],
                updatedAt: FieldValue.serverTimestamp(),
              });

              // Create transaction record
              const transactionRef = adminDb.collection('transactions').doc();
              transaction.set(transactionRef, {
                userId,
                type: 'package_purchase',
                amount: amount,
                description: `${newPackage.name}: ${packageMinutes} minutes`,
                packageId,
                createdAt: FieldValue.serverTimestamp(),
                sessionId: session.id,
              });

              console.log(`[WEBHOOK] ✅ Package added via checkout for user ${userId}: ${packageName} (${packageMinutes} minutes)`);

            } else if (paymentType === 'wallet') {
              // Handle wallet top-up from checkout
              const currentWallet = userData?.walletBalance || 0;
              const newBalance = currentWallet + amount;

              transaction.update(userRef, {
                walletBalance: newBalance,
                credits: 0, // Clear legacy credits
                updatedAt: FieldValue.serverTimestamp(),
              });

              // Create transaction record
              const transactionRef = adminDb.collection('transactions').doc();
              transaction.set(transactionRef, {
                userId,
                type: 'wallet_topup',
                amount: amount,
                description: `Wallet top-up: CA$${amount.toFixed(2)}`,
                createdAt: FieldValue.serverTimestamp(),
                sessionId: session.id,
              });

              console.log(`[WEBHOOK] ✅ Wallet updated via checkout for user ${userId}:`, {
                previousBalance: `CA$${currentWallet.toFixed(2)}`,
                addedAmount: `CA$${amount.toFixed(2)}`,
                newBalance: `CA$${newBalance.toFixed(2)}`,
              });
            }
          });

          console.log('[WEBHOOK] ✅ Database transaction completed successfully');
        } catch (error) {
          console.error('[WEBHOOK] ❌ Error processing checkout session:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId,
            sessionId: session.id,
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        console.log('Payment succeeded:', paymentIntent.id);

        const userId = paymentIntent.metadata.userId;
        const paymentType = paymentIntent.metadata.type; // 'package' or 'wallet'
        const amount = paymentIntent.amount / 100; // Convert cents to dollars

        if (!userId) {
          console.error('Missing userId in payment intent metadata:', paymentIntent.metadata);
          break;
        }

        try {
          const userRef = adminDb.collection('users').doc(userId);

          await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
              console.error('User document not found:', userId);
              return;
            }

            const userData = userDoc.data();

            if (paymentType === 'package') {
              // Handle package purchase
              const packageType = paymentIntent.metadata.packageType; // 'ai', 'hybrid', or 'human'
              const packageMinutes = parseInt(paymentIntent.metadata.packageMinutes);
              const packageRate = parseFloat(paymentIntent.metadata.packageRate);
              const packageName = paymentIntent.metadata.packageName;

              if (!packageType || !packageMinutes || !packageRate) {
                console.error('Missing package metadata:', paymentIntent.metadata);
                return;
              }

              // Create package object
              const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const now = new Date();
              const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

              const newPackage = {
                id: packageId,
                type: packageType,
                name: packageName || `${packageType.charAt(0).toUpperCase() + packageType.slice(1)} Package`,
                minutesTotal: packageMinutes,
                minutesUsed: 0,
                minutesRemaining: packageMinutes,
                rate: packageRate,
                purchasedAt: now,
                expiresAt: expiresAt,
                active: true
              };

              // Update user with new package
              const currentPackages = userData?.packages || [];
              transaction.update(userRef, {
                packages: [...currentPackages, newPackage],
                updatedAt: FieldValue.serverTimestamp(),
              });

              // Create transaction record
              const transactionRef = adminDb.collection('transactions').doc();
              transaction.set(transactionRef, {
                userId,
                type: 'package_purchase',
                amount: amount,
                description: `${newPackage.name}: ${packageMinutes} minutes`,
                packageId,
                createdAt: FieldValue.serverTimestamp(),
                paymentIntentId: paymentIntent.id,
              });

              console.log(`Package added for user ${userId}: ${packageName} (${packageMinutes} minutes)`);

            } else if (paymentType === 'wallet' || !paymentType) {
              // Handle wallet top-up (default if no type specified)
              const currentWallet = userData?.walletBalance || 0;
              const currentCredits = userData?.credits || 0;

              // Add amount to wallet and clear legacy credits
              transaction.update(userRef, {
                walletBalance: currentWallet + amount,
                credits: 0, // Clear legacy credits after combining
                updatedAt: FieldValue.serverTimestamp(),
              });

              // Create transaction record
              const transactionRef = adminDb.collection('transactions').doc();
              transaction.set(transactionRef, {
                userId,
                type: 'wallet_topup',
                amount: amount,
                description: `Wallet top-up: CA$${amount.toFixed(2)}`,
                createdAt: FieldValue.serverTimestamp(),
                paymentIntentId: paymentIntent.id,
              });

              console.log(`Wallet updated for user ${userId}: +CA$${amount.toFixed(2)}`);
            }
          });
        } catch (error) {
          console.error('Error processing payment:', error);
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
        console.log(`[WEBHOOK] ⚠️ Unhandled event type: ${event.type}`);
    }

    console.log('[WEBHOOK] ✅ Webhook processing completed successfully');
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error('[WEBHOOK] ❌ Critical webhook error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Webhook handler failed - check Vercel logs for details' },
      { status: 500 }
    );
  }
}