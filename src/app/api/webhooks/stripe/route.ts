/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import {
  syncSubscriptionStatus,
  resetMonthlyUsage,
  getSubscription,
} from '@/lib/services/subscription.service';
import { adminDb as db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      // Subscription created
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(subscription.id);
        await logWebhookEvent(event);
        break;
      }

      // Subscription updated
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(subscription.id);
        await logWebhookEvent(event);
        break;
      }

      // Subscription deleted/canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(subscription.id);
        await logWebhookEvent(event);
        break;
      }

      // Invoice payment succeeded - reset usage for new billing period
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          // This is a recurring billing cycle - reset usage
          const subscriptionId = invoice.subscription as string;

          // Find our subscription document
          const snapshot = await db
            .collection('subscriptions')
            .where('stripeSubscriptionId', '==', subscriptionId)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await resetMonthlyUsage(doc.id);
            console.log(`[Stripe Webhook] Reset usage for subscription: ${doc.id}`);
          }
        }

        await logWebhookEvent(event);
        break;
      }

      // Invoice payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          await syncSubscriptionStatus(subscriptionId);

          // Optionally: Send notification to user about failed payment
          console.log(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`);
        }

        await logWebhookEvent(event);
        break;
      }

      // Trial will end soon (3 days before)
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;

        // Optionally: Send notification to user about trial ending
        console.log(`[Stripe Webhook] Trial ending soon for: ${subscription.id}`);

        await logWebhookEvent(event);
        break;
      }

      // Payment method attached
      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`[Stripe Webhook] Payment method attached: ${paymentMethod.id}`);
        await logWebhookEvent(event);
        break;
      }

      // Payment method detached
      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`[Stripe Webhook] Payment method detached: ${paymentMethod.id}`);
        await logWebhookEvent(event);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error processing event: ${error.message}`);
    return NextResponse.json(
      { error: `Webhook handler failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Log webhook event to Firestore
 */
async function logWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    await db.collection('subscriptionEvents').add({
      type: event.type,
      stripeEventId: event.id,
      timestamp: Timestamp.fromMillis(event.created * 1000),
      data: event.data.object,
      processed: true,
      processedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[Stripe Webhook] Error logging event:', error);
  }
}
