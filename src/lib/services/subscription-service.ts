import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import {
  UserSubscriptionData,
  SubscriptionPlanId,
  SubscriptionStatus,
  TranscriptionMode,
  AccessValidationResult
} from '@/types/subscription';
import { getPlanById, planAllowsMode, calculateCreditsRequired } from '../subscriptions/plans';
import {
  createOrGetCustomer,
  createSubscription as stripeCreateSubscription,
  updateSubscription as stripeUpdateSubscription,
  cancelSubscription as stripeCancelSubscription,
  reactivateSubscription as stripeReactivateSubscription
} from '../stripe/subscriptions';

/**
 * Initialize subscription for a new user
 */
export async function initializeUserSubscription(
  userId: string,
  email: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const existingData = userDoc.data();

    // Only initialize if not already set
    if (!existingData.subscriptionPlan) {
      await updateDoc(userRef, {
        subscriptionPlan: 'none',
        subscriptionStatus: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        includedMinutesPerMonth: 0,
        minutesUsedThisMonth: 0,
        minutesReserved: 0,
        billingCycleStart: null,
        billingCycleEnd: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialStart: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        credits: existingData.credits || 0
      });
    }
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    throw error;
  }
}

/**
 * Subscribe user to a plan
 */
export async function subscribeUser(
  userId: string,
  email: string,
  planId: SubscriptionPlanId,
  paymentMethodId: string,
  enableTrial: boolean = true
): Promise<{ subscriptionId: string; clientSecret: string | null }> {
  try {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    // Create Stripe customer if needed
    const customer = await createOrGetCustomer(userId, email);

    // Create subscription in Stripe
    const subscription = await stripeCreateSubscription({
      userId,
      planId,
      paymentMethodId,
      trialEnabled: enableTrial
    });

    // Update Firestore with subscription data
    const userRef = doc(db, 'users', userId);
    const now = Timestamp.now();
    const trialEnd = enableTrial
      ? Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;

    await updateDoc(userRef, {
      subscriptionPlan: planId,
      subscriptionStatus: enableTrial ? 'trialing' : 'active',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: plan.stripePriceId,
      includedMinutesPerMonth: plan.includedMinutes,
      minutesUsedThisMonth: 0,
      minutesReserved: 0,
      billingCycleStart: Timestamp.fromMillis(subscription.current_period_start * 1000),
      billingCycleEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
      currentPeriodStart: Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
      trialStart: enableTrial ? now : null,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null
    });

    // Get client secret from latest invoice if payment required
    const latestInvoice = subscription.latest_invoice;
    let clientSecret = null;

    if (typeof latestInvoice === 'object' && latestInvoice?.payment_intent) {
      const paymentIntent = latestInvoice.payment_intent;
      if (typeof paymentIntent === 'object') {
        clientSecret = paymentIntent.client_secret;
      }
    }

    return {
      subscriptionId: subscription.id,
      clientSecret
    };
  } catch (error) {
    console.error('Error subscribing user:', error);
    throw error;
  }
}

/**
 * Change user's subscription plan
 */
export async function changePlan(
  userId: string,
  newPlanId: SubscriptionPlanId
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as UserSubscriptionData;

    if (!userData.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const newPlan = getPlanById(newPlanId);
    if (!newPlan) {
      throw new Error(`Invalid plan: ${newPlanId}`);
    }

    // Update in Stripe
    const updatedSubscription = await stripeUpdateSubscription({
      userId,
      newPlanId,
      prorationBehavior: 'create_prorations'
    });

    // Update in Firestore
    await updateDoc(userRef, {
      subscriptionPlan: newPlanId,
      stripePriceId: newPlan.stripePriceId,
      includedMinutesPerMonth: newPlan.includedMinutes,
      currentPeriodStart: Timestamp.fromMillis(updatedSubscription.current_period_start * 1000),
      currentPeriodEnd: Timestamp.fromMillis(updatedSubscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    throw error;
  }
}

/**
 * Cancel user's subscription
 */
export async function cancelUserSubscription(
  userId: string,
  immediate: boolean = false,
  reason?: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as UserSubscriptionData;

    if (!userData.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel in Stripe
    await stripeCancelSubscription(userData.stripeSubscriptionId, immediate);

    // Update in Firestore
    const updates: Partial<UserSubscriptionData> = {
      cancelAtPeriodEnd: !immediate,
      canceledAt: Timestamp.now()
    };

    if (immediate) {
      updates.subscriptionStatus = 'canceled';
      updates.subscriptionPlan = 'none';
      updates.includedMinutesPerMonth = 0;
    }

    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateUserSubscription(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as UserSubscriptionData;

    if (!userData.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    if (!userData.cancelAtPeriodEnd) {
      throw new Error('Subscription is not scheduled for cancellation');
    }

    // Reactivate in Stripe
    await stripeReactivateSubscription(userData.stripeSubscriptionId);

    // Update in Firestore
    await updateDoc(userRef, {
      cancelAtPeriodEnd: false,
      canceledAt: null
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Validate if user can access a transcription mode
 */
export async function validateAccess(
  userId: string,
  mode: TranscriptionMode,
  estimatedMinutes: number
): Promise<AccessValidationResult> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return {
        hasAccess: false,
        reason: 'User not found',
        allowedModes: [],
        requiresCredits: false,
        estimatedCost: 0
      };
    }

    const userData = userDoc.data() as UserSubscriptionData;

    // Check subscription status
    const hasActiveSubscription =
      userData.subscriptionPlan &&
      userData.subscriptionPlan !== 'none' &&
      (userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing');

    // Get plan details
    const plan = hasActiveSubscription ? getPlanById(userData.subscriptionPlan) : null;

    // Check if plan allows this mode
    if (plan && planAllowsMode(userData.subscriptionPlan, mode)) {
      const minutesUsed = userData.minutesUsedThisMonth || 0;
      const minutesReserved = userData.minutesReserved || 0;
      const availableMinutes = userData.includedMinutesPerMonth - minutesUsed - minutesReserved;

      if (availableMinutes >= estimatedMinutes) {
        // Can use subscription minutes
        return {
          hasAccess: true,
          reason: 'Using subscription minutes',
          allowedModes: plan.allowedModes,
          requiresCredits: false,
          estimatedCost: 0
        };
      } else if (availableMinutes > 0) {
        // Partial subscription + credits
        const overageMinutes = estimatedMinutes - availableMinutes;
        const creditsRequired = calculateCreditsRequired(mode, overageMinutes);

        if (userData.credits >= creditsRequired) {
          return {
            hasAccess: true,
            reason: `Using ${availableMinutes} subscription minutes + ${creditsRequired} credits`,
            allowedModes: plan.allowedModes,
            requiresCredits: true,
            estimatedCost: creditsRequired
          };
        } else {
          return {
            hasAccess: false,
            reason: `Insufficient credits for overage. Need ${creditsRequired}, have ${userData.credits}`,
            allowedModes: plan.allowedModes,
            requiresCredits: true,
            estimatedCost: creditsRequired
          };
        }
      }
    }

    // Fall back to credits
    const creditsRequired = calculateCreditsRequired(mode, estimatedMinutes);

    if (userData.credits >= creditsRequired) {
      return {
        hasAccess: true,
        reason: 'Using credits',
        allowedModes: ['ai', 'hybrid', 'human'],
        requiresCredits: true,
        estimatedCost: creditsRequired
      };
    } else {
      return {
        hasAccess: false,
        reason: `Insufficient credits. Need ${creditsRequired}, have ${userData.credits}`,
        allowedModes: [],
        requiresCredits: true,
        estimatedCost: creditsRequired
      };
    }
  } catch (error) {
    console.error('Error validating access:', error);
    throw error;
  }
}

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string): Promise<UserSubscriptionData | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data() as UserSubscriptionData;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
}
