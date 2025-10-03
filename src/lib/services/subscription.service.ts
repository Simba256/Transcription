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
  paymentMethodId?: string | null,
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

  // Attach payment method to customer if provided
  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  // Flow:
  // 1. New user gets 180 free trial minutes (no subscription, no payment)
  // 2. When user subscribes, they pay immediately for the plan
  // 3. Trial ends when subscription starts (no rollback)
  // 4. After subscribing, user gets their plan's included minutes each month

  console.log('[createSubscription] Creating subscription:', {
    userId,
    planId: plan.id,
    priceMonthly: plan.priceMonthly,
  });

  // Create Stripe subscription - user pays immediately (no trial period in Stripe)
  const stripeSubscription = await createStripeSubHelper(
    customer.id,
    plan.stripePriceId,
    undefined // No Stripe trial - user pays when subscribing
  );

  console.log('[createSubscription] Stripe subscription created:', {
    id: stripeSubscription.id,
    status: stripeSubscription.status,
    current_period_start: stripeSubscription.current_period_start,
    current_period_end: stripeSubscription.current_period_end,
    trial_start: stripeSubscription.trial_start,
    trial_end: stripeSubscription.trial_end,
  });

  // Calculate period dates
  if (!stripeSubscription.current_period_start || !stripeSubscription.current_period_end) {
    throw new Error('Invalid subscription period dates from Stripe');
  }

  const currentPeriodStart = Timestamp.fromMillis(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = Timestamp.fromMillis(stripeSubscription.current_period_end * 1000);

  // Create subscription document
  // Only includes plan minutes, NOT trial minutes (trial is separate from subscription)
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
    minutesIncluded: plan.minutesIncluded, // Only plan minutes, NOT trial
    minutesUsed: 0,
    minutesRemaining: plan.minutesIncluded,
    priceMonthly: plan.priceMonthly,
    currency: plan.currency,
    trialMinutesUsed: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const subscriptionRef = await db.collection('subscriptions').add(subscription);
  const createdSubscription = { ...subscription, id: subscriptionRef.id };

  // Update user document
  // Mark trial as used when user subscribes (trial ends, no rollback)
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
      trialUsed: true, // Mark trial as used - no more free trial
      trialMinutesRemaining: 0, // Trial ends when subscription starts
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
 * Create subscription from existing Stripe subscription (webhook handler)
 */
export async function createSubscriptionFromStripe(
  userId: string,
  stripeSubscription: any
): Promise<Subscription> {
  // Get plan by price ID
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const plan = Object.values(SUBSCRIPTION_PLANS).find(
    p => p && p.stripePriceId === priceId
  );

  if (!plan) {
    throw new Error(`No plan found for Stripe price ID: ${priceId}`);
  }

  // Calculate period dates - use current time as fallback if not set yet
  let currentPeriodStart: Timestamp;
  let currentPeriodEnd: Timestamp;

  if (stripeSubscription.current_period_start && stripeSubscription.current_period_end) {
    currentPeriodStart = Timestamp.fromMillis(stripeSubscription.current_period_start * 1000);
    currentPeriodEnd = Timestamp.fromMillis(stripeSubscription.current_period_end * 1000);
  } else {
    // Fallback: use billing_cycle_anchor or current time
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    currentPeriodStart = Timestamp.fromMillis(stripeSubscription.billing_cycle_anchor ? stripeSubscription.billing_cycle_anchor * 1000 : now);
    currentPeriodEnd = Timestamp.fromMillis(
      stripeSubscription.billing_cycle_anchor
        ? (stripeSubscription.billing_cycle_anchor * 1000) + oneMonth
        : now + oneMonth
    );

    console.warn('Subscription period dates not set, using fallback dates');
  }

  // Create subscription document
  const subscription: Omit<Subscription, 'id'> = {
    userId,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: stripeSubscription.customer as string,
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
      stripeCustomerId: stripeSubscription.customer,
      currentPeriodStart,
      currentPeriodEnd,
      currentPeriodMinutesUsed: 0,
      minutesUsedThisMonth: 0, // For upload page compatibility
      includedMinutesPerMonth: plan.minutesIncluded, // Set included minutes for the plan
      trialUsed: true, // Mark trial as used when subscribing
      trialMinutesRemaining: 0, // Trial ends when subscription starts
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
      source: 'webhook',
    },
    processed: true,
  });

  return createdSubscription;
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
