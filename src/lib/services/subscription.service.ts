/**
 * Subscription Service
 * Business logic for subscription management
 */

import { adminDb as db } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { PlanId, Subscription, SubscriptionStatus, SubscriptionEvent } from '@/lib/types/subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/plans';
import {
  stripe,
  getOrCreateStripeCustomer,
  createStripeSubscription as createStripeSubHelper,
  updateStripeSubscription as updateStripeSubHelper,
  cancelStripeSubscription as cancelStripeSubHelper,
  getStripeSubscription,
} from '@/lib/stripe/client';

/**
 * Create a new subscription
 */
export async function createSubscription(
  userId: string,
  email: string,
  planId: PlanId,
  paymentMethodId: string,
  name?: string
): Promise<{ subscription: Subscription; clientSecret?: string }> {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  if (!plan.stripePriceId) {
    throw new Error(`Plan ${planId} is missing Stripe price ID`);
  }

  // Get or create Stripe customer
  const customer = await getOrCreateStripeCustomer(userId, email, name);

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customer.id,
  });

  // Set as default payment method
  await stripe.customers.update(customer.id, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Create Stripe subscription with trial
  const stripeSubscription = await createStripeSubHelper(
    customer.id,
    plan.stripePriceId,
    30 // 30-day trial period
  );

  // Calculate period dates
  const currentPeriodStart = Timestamp.fromMillis(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = Timestamp.fromMillis(stripeSubscription.current_period_end * 1000);
  const trialEnd = stripeSubscription.trial_end
    ? Timestamp.fromMillis(stripeSubscription.trial_end * 1000)
    : undefined;

  // Create subscription document
  const subscription: Omit<Subscription, 'id'> = {
    userId,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: customer.id,
    planId: plan.id,
    planType: plan.type,
    status: stripeSubscription.status as SubscriptionStatus,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    minutesIncluded: plan.minutesIncluded,
    minutesUsed: 0,
    minutesRemaining: plan.minutesIncluded,
    priceMonthly: plan.priceMonthly,
    currency: plan.currency,
    trialEnd,
    trialMinutesUsed: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const subscriptionRef = await db.collection('subscriptions').add(subscription);
  const createdSubscription = { ...subscription, id: subscriptionRef.id };

  // Update user document
  await db
    .collection('users')
    .doc(userId)
    .update({
      subscriptionId: subscriptionRef.id,
      subscriptionPlan: plan.id,
      subscriptionStatus: stripeSubscription.status,
      stripeCustomerId: customer.id,
      currentPeriodStart,
      currentPeriodEnd,
      currentPeriodMinutesUsed: 0,
      updatedAt: Timestamp.now(),
    });

  // Log event
  await logSubscriptionEvent({
    type: 'subscription_created',
    subscriptionId: subscriptionRef.id,
    userId,
    timestamp: Timestamp.now(),
    data: {
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
    },
    processed: true,
  });

  // Get client secret from latest invoice if exists
  const latestInvoice = stripeSubscription.latest_invoice;
  let clientSecret: string | undefined;

  if (latestInvoice && typeof latestInvoice === 'object' && 'payment_intent' in latestInvoice) {
    const paymentIntent = latestInvoice.payment_intent;
    if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in paymentIntent) {
      clientSecret = paymentIntent.client_secret as string;
    }
  }

  return { subscription: createdSubscription, clientSecret };
}

/**
 * Update subscription (change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlanId: PlanId,
  prorate: boolean = true
): Promise<Subscription> {
  // Get current subscription
  const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!subscriptionDoc.exists) {
    throw new Error('Subscription not found');
  }

  const currentSubscription = {
    id: subscriptionDoc.id,
    ...subscriptionDoc.data(),
  } as Subscription;

  // Get new plan
  const newPlan = SUBSCRIPTION_PLANS[newPlanId];
  if (!newPlan) {
    throw new Error(`Invalid plan ID: ${newPlanId}`);
  }

  if (!newPlan.stripePriceId) {
    throw new Error(`Plan ${newPlanId} is missing Stripe price ID`);
  }

  // Update Stripe subscription
  const stripeSubscription = await updateStripeSubHelper(
    currentSubscription.stripeSubscriptionId,
    newPlan.stripePriceId,
    prorate
  );

  // Update Firestore document
  const updates = {
    planId: newPlan.id,
    planType: newPlan.type,
    minutesIncluded: newPlan.minutesIncluded,
    minutesRemaining: Math.max(0, newPlan.minutesIncluded - currentSubscription.minutesUsed),
    priceMonthly: newPlan.priceMonthly,
    currency: newPlan.currency,
    status: stripeSubscription.status as SubscriptionStatus,
    updatedAt: Timestamp.now(),
  };

  await db.collection('subscriptions').doc(subscriptionId).update(updates);

  // Update user document
  await db
    .collection('users')
    .doc(currentSubscription.userId)
    .update({
      subscriptionPlan: newPlan.id,
      subscriptionStatus: stripeSubscription.status,
      updatedAt: Timestamp.now(),
    });

  // Log event
  await logSubscriptionEvent({
    type: 'subscription_updated',
    subscriptionId,
    userId: currentSubscription.userId,
    timestamp: Timestamp.now(),
    data: {
      oldPlanId: currentSubscription.planId,
      newPlanId: newPlan.id,
      prorate,
    },
    processed: true,
  });

  return { ...currentSubscription, ...updates };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false,
  cancellationReason?: string
): Promise<Subscription> {
  // Get current subscription
  const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!subscriptionDoc.exists) {
    throw new Error('Subscription not found');
  }

  const currentSubscription = {
    id: subscriptionDoc.id,
    ...subscriptionDoc.data(),
  } as Subscription;

  // Cancel Stripe subscription
  const stripeSubscription = await cancelStripeSubHelper(
    currentSubscription.stripeSubscriptionId,
    immediate
  );

  // Update Firestore document
  const updates: Partial<Subscription> = {
    status: stripeSubscription.status as SubscriptionStatus,
    cancelAtPeriodEnd: !immediate && stripeSubscription.cancel_at_period_end,
    updatedAt: Timestamp.now(),
  };

  if (immediate) {
    updates.canceledAt = Timestamp.now();
  }

  await db.collection('subscriptions').doc(subscriptionId).update(updates);

  // Update user document
  await db
    .collection('users')
    .doc(currentSubscription.userId)
    .update({
      subscriptionStatus: stripeSubscription.status,
      updatedAt: Timestamp.now(),
    });

  // Log event
  await logSubscriptionEvent({
    type: 'subscription_canceled',
    subscriptionId,
    userId: currentSubscription.userId,
    timestamp: Timestamp.now(),
    data: {
      immediate,
      cancellationReason,
    },
    processed: true,
  });

  return { ...currentSubscription, ...updates };
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Subscription | null> {
  const doc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as Subscription;
}

/**
 * Get user's active subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const snapshot = await db
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', 'in', ['active', 'trialing', 'past_due'])
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Subscription;
}

/**
 * Track usage for a subscription
 */
export async function trackSubscriptionUsage(
  subscriptionId: string,
  minutes: number
): Promise<void> {
  const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
  const doc = await subscriptionRef.get();

  if (!doc.exists) {
    throw new Error('Subscription not found');
  }

  const subscription = { id: doc.id, ...doc.data() } as Subscription;

  // Check if in trial period
  const isInTrial =
    subscription.trialEnd && Timestamp.now().toMillis() < subscription.trialEnd.toMillis();

  // Update minutes
  await subscriptionRef.update({
    minutesUsed: FieldValue.increment(minutes),
    minutesRemaining: FieldValue.increment(-minutes),
    ...(isInTrial && { trialMinutesUsed: FieldValue.increment(minutes) }),
    updatedAt: Timestamp.now(),
  });

  // Update user document
  await db
    .collection('users')
    .doc(subscription.userId)
    .update({
      currentPeriodMinutesUsed: FieldValue.increment(minutes),
      lifetimeMinutesUsed: FieldValue.increment(minutes),
      updatedAt: Timestamp.now(),
    });
}

/**
 * Reset monthly usage (called by webhook on billing cycle)
 */
export async function resetMonthlyUsage(subscriptionId: string): Promise<void> {
  const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
  const doc = await subscriptionRef.get();

  if (!doc.exists) {
    throw new Error('Subscription not found');
  }

  const subscription = { id: doc.id, ...doc.data() } as Subscription;

  await subscriptionRef.update({
    minutesUsed: 0,
    minutesRemaining: subscription.minutesIncluded,
    trialMinutesUsed: 0, // Reset trial minutes too
    updatedAt: Timestamp.now(),
  });

  await db
    .collection('users')
    .doc(subscription.userId)
    .update({
      currentPeriodMinutesUsed: 0,
      updatedAt: Timestamp.now(),
    });
}

/**
 * Log subscription event
 */
async function logSubscriptionEvent(
  event: Omit<SubscriptionEvent, 'id' | 'createdAt'>
): Promise<void> {
  await db.collection('subscriptionEvents').add({
    ...event,
    createdAt: Timestamp.now(),
  });
}

/**
 * Sync subscription status from Stripe
 */
export async function syncSubscriptionStatus(stripeSubscriptionId: string): Promise<void> {
  // Get Stripe subscription
  const stripeSubscription = await getStripeSubscription(stripeSubscriptionId);

  // Find Firestore subscription
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', stripeSubscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.error(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
    return;
  }

  const doc = snapshot.docs[0];
  const subscription = { id: doc.id, ...doc.data() } as Subscription;

  // Update status and period
  const updates: Partial<Subscription> = {
    status: stripeSubscription.status as SubscriptionStatus,
    currentPeriodStart: Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: Timestamp.fromMillis(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    updatedAt: Timestamp.now(),
  };

  if (stripeSubscription.canceled_at) {
    updates.canceledAt = Timestamp.fromMillis(stripeSubscription.canceled_at * 1000);
  }

  await db.collection('subscriptions').doc(doc.id).update(updates);

  // Update user document
  await db
    .collection('users')
    .doc(subscription.userId)
    .update({
      subscriptionStatus: stripeSubscription.status,
      currentPeriodStart: updates.currentPeriodStart,
      currentPeriodEnd: updates.currentPeriodEnd,
      updatedAt: Timestamp.now(),
    });
}
