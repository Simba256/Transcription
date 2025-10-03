import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  runTransaction,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  UserSubscriptionData,
  UsageRecord,
  SubscriptionUsage,
  MinuteConsumptionRequest,
  MinuteConsumptionResult,
  TranscriptionMode
} from '@/types/subscription';
import { calculateCreditsRequired, planAllowsMode } from './plans';

/**
 * Get user's subscription usage summary
 */
export async function getSubscriptionUsage(userId: string): Promise<SubscriptionUsage | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as UserSubscriptionData;

    // If no active subscription
    if (!userData.subscriptionPlan || userData.subscriptionPlan === 'none') {
      return null;
    }

    const now = new Date();
    const cycleEnd = userData.billingCycleEnd?.toDate() || now;
    const cycleStart = userData.billingCycleStart?.toDate() || now;
    const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const minutesUsed = userData.minutesUsedThisMonth || 0;
    const includedMinutes = userData.includedMinutesPerMonth || 0;
    const minutesRemaining = Math.max(0, includedMinutes - minutesUsed);
    const percentageUsed = includedMinutes > 0 ? (minutesUsed / includedMinutes) * 100 : 0;

    // Calculate overage (minutes used beyond subscription)
    const overageMinutes = Math.max(0, minutesUsed - includedMinutes);

    // Get overage credits used from usage records
    const usageQuery = query(
      collection(db, 'usageRecords'),
      where('userId', '==', userId),
      where('source', '==', 'overage'),
      where('billingCycleStart', '==', userData.billingCycleStart)
    );

    const usageSnapshot = await getDocs(usageQuery);
    const overageCreditsUsed = usageSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().creditsUsed || 0),
      0
    );

    return {
      planName: userData.subscriptionPlan,
      includedMinutes,
      minutesUsed,
      minutesRemaining,
      minutesReserved: userData.minutesReserved || 0,
      percentageUsed,
      billingCycleStart: cycleStart,
      billingCycleEnd: cycleEnd,
      daysRemaining,
      status: userData.subscriptionStatus,
      overageMinutes,
      overageCreditsUsed
    };
  } catch (error) {
    console.error('Error getting subscription usage:', error);
    throw error;
  }
}

/**
 * Reserve minutes for a transcription job (handles concurrent submissions)
 */
export async function reserveMinutes(
  request: MinuteConsumptionRequest
): Promise<MinuteConsumptionResult> {
  const { userId, transcriptionId, mode, estimatedMinutes } = request;

  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          source: 'insufficient',
          minutesFromSubscription: 0,
          creditsUsed: 0,
          minutesReserved: 0,
          remainingMinutes: 0,
          remainingCredits: 0,
          message: 'User not found'
        };
      }

      const userData = userDoc.data() as UserSubscriptionData;

      // Check subscription status
      const hasActiveSubscription =
        userData.subscriptionPlan &&
        userData.subscriptionPlan !== 'none' &&
        (userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing');

      // Check if plan allows this mode
      if (hasActiveSubscription && !planAllowsMode(userData.subscriptionPlan, mode)) {
        // Mode not allowed by subscription, fall back to credits
        const creditsRequired = calculateCreditsRequired(mode, estimatedMinutes);

        if (userData.credits >= creditsRequired) {
          // Deduct credits immediately
          transaction.update(userRef, {
            credits: userData.credits - creditsRequired
          });

          return {
            success: true,
            source: 'credits',
            minutesFromSubscription: 0,
            creditsUsed: creditsRequired,
            minutesReserved: 0,
            remainingMinutes: userData.includedMinutesPerMonth - userData.minutesUsedThisMonth,
            remainingCredits: userData.credits - creditsRequired,
            message: `Used ${creditsRequired} credits for ${mode} transcription`
          };
        } else {
          return {
            success: false,
            source: 'insufficient',
            minutesFromSubscription: 0,
            creditsUsed: 0,
            minutesReserved: 0,
            remainingMinutes: userData.includedMinutesPerMonth - userData.minutesUsedThisMonth,
            remainingCredits: userData.credits,
            message: `Insufficient credits. Required: ${creditsRequired}, Available: ${userData.credits}`
          };
        }
      }

      // Try to use subscription minutes
      if (hasActiveSubscription) {
        const minutesUsed = userData.minutesUsedThisMonth || 0;
        const minutesReserved = userData.minutesReserved || 0;
        const includedMinutes = userData.includedMinutesPerMonth || 0;
        const availableMinutes = includedMinutes - minutesUsed - minutesReserved;

        if (availableMinutes >= estimatedMinutes) {
          // Reserve minutes from subscription
          transaction.update(userRef, {
            minutesReserved: minutesReserved + estimatedMinutes
          });

          return {
            success: true,
            source: 'subscription',
            minutesFromSubscription: estimatedMinutes,
            creditsUsed: 0,
            minutesReserved: estimatedMinutes,
            remainingMinutes: availableMinutes - estimatedMinutes,
            remainingCredits: userData.credits,
            message: `Reserved ${estimatedMinutes} minutes from subscription`
          };
        } else if (availableMinutes > 0) {
          // Partial subscription + credits for overage
          const minutesFromSubscription = availableMinutes;
          const minutesFromCredits = estimatedMinutes - availableMinutes;
          const creditsRequired = calculateCreditsRequired(mode, minutesFromCredits);

          if (userData.credits >= creditsRequired) {
            transaction.update(userRef, {
              minutesReserved: minutesReserved + minutesFromSubscription,
              credits: userData.credits - creditsRequired
            });

            return {
              success: true,
              source: 'subscription',
              minutesFromSubscription,
              creditsUsed: creditsRequired,
              minutesReserved: minutesFromSubscription,
              remainingMinutes: 0,
              remainingCredits: userData.credits - creditsRequired,
              message: `Used ${minutesFromSubscription} subscription minutes + ${creditsRequired} credits for overage`
            };
          } else {
            return {
              success: false,
              source: 'insufficient',
              minutesFromSubscription: 0,
              creditsUsed: 0,
              minutesReserved: 0,
              remainingMinutes: availableMinutes,
              remainingCredits: userData.credits,
              message: `Insufficient credits for overage. Required: ${creditsRequired}, Available: ${userData.credits}`
            };
          }
        }
      }

      // No subscription or no minutes left - use credits only
      const creditsRequired = calculateCreditsRequired(mode, estimatedMinutes);

      if (userData.credits >= creditsRequired) {
        transaction.update(userRef, {
          credits: userData.credits - creditsRequired
        });

        return {
          success: true,
          source: 'credits',
          minutesFromSubscription: 0,
          creditsUsed: creditsRequired,
          minutesReserved: 0,
          remainingMinutes: 0,
          remainingCredits: userData.credits - creditsRequired,
          message: `Used ${creditsRequired} credits`
        };
      } else {
        return {
          success: false,
          source: 'insufficient',
          minutesFromSubscription: 0,
          creditsUsed: 0,
          minutesReserved: 0,
          remainingMinutes: 0,
          remainingCredits: userData.credits,
          message: `Insufficient credits. Required: ${creditsRequired}, Available: ${userData.credits}`
        };
      }
    });
  } catch (error) {
    console.error('Error reserving minutes:', error);
    throw error;
  }
}

/**
 * Confirm minute usage when job completes (convert reservation to actual usage)
 */
export async function confirmMinuteUsage(
  userId: string,
  transcriptionId: string,
  mode: TranscriptionMode,
  actualMinutes: number,
  reservedMinutes: number
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data() as UserSubscriptionData;

      const minutesDifference = actualMinutes - reservedMinutes;
      const newMinutesUsed = (userData.minutesUsedThisMonth || 0) + actualMinutes;
      const newMinutesReserved = Math.max(0, (userData.minutesReserved || 0) - reservedMinutes);

      // Update user's usage
      transaction.update(userRef, {
        minutesUsedThisMonth: newMinutesUsed,
        minutesReserved: newMinutesReserved
      });

      // Create usage record
      const usageRecordRef = doc(collection(db, 'usageRecords'));
      const usageRecord: Omit<UsageRecord, 'id'> = {
        userId,
        transcriptionId,
        mode,
        minutesUsed: actualMinutes,
        creditsUsed: 0, // Set appropriately based on source
        source: 'subscription',
        timestamp: Timestamp.now(),
        billingCycleStart: userData.billingCycleStart || Timestamp.now(),
        billingCycleEnd: userData.billingCycleEnd || Timestamp.now()
      };

      transaction.set(usageRecordRef, usageRecord);
    });
  } catch (error) {
    console.error('Error confirming minute usage:', error);
    throw error;
  }
}

/**
 * Release reserved minutes if job fails or is canceled
 */
export async function releaseReservedMinutes(
  userId: string,
  reservedMinutes: number
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data() as UserSubscriptionData;
      const newReserved = Math.max(0, (userData.minutesReserved || 0) - reservedMinutes);

      transaction.update(userRef, {
        minutesReserved: newReserved
      });
    });
  } catch (error) {
    console.error('Error releasing reserved minutes:', error);
    throw error;
  }
}

/**
 * Reset monthly usage (called by webhook on billing cycle renewal)
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      minutesUsedThisMonth: 0,
      minutesReserved: 0
    });
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
    throw error;
  }
}

/**
 * Get usage history for a user
 */
export async function getUserUsageHistory(
  userId: string,
  limitCount: number = 50
): Promise<UsageRecord[]> {
  try {
    const usageQuery = query(
      collection(db, 'usageRecords'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(usageQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UsageRecord));
  } catch (error) {
    console.error('Error getting usage history:', error);
    throw error;
  }
}

/**
 * Calculate usage statistics for admin analytics
 */
export async function calculateUsageStats(startDate: Date, endDate: Date): Promise<{
  totalMinutesUsed: number;
  totalCreditsUsed: number;
  usageByMode: Record<TranscriptionMode, number>;
  usageBySource: Record<'subscription' | 'credits' | 'overage', number>;
  averageMinutesPerUser: number;
}> {
  try {
    const usageQuery = query(
      collection(db, 'usageRecords'),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(usageQuery);
    const records = snapshot.docs.map(doc => doc.data() as UsageRecord);

    const totalMinutesUsed = records.reduce((sum, record) => sum + record.minutesUsed, 0);
    const totalCreditsUsed = records.reduce((sum, record) => sum + record.creditsUsed, 0);

    const usageByMode: Record<TranscriptionMode, number> = {
      ai: 0,
      hybrid: 0,
      human: 0
    };

    const usageBySource: Record<'subscription' | 'credits' | 'overage', number> = {
      subscription: 0,
      credits: 0,
      overage: 0
    };

    records.forEach(record => {
      usageByMode[record.mode] += record.minutesUsed;
      usageBySource[record.source] += record.minutesUsed;
    });

    const uniqueUsers = new Set(records.map(r => r.userId)).size;
    const averageMinutesPerUser = uniqueUsers > 0 ? totalMinutesUsed / uniqueUsers : 0;

    return {
      totalMinutesUsed,
      totalCreditsUsed,
      usageByMode,
      usageBySource,
      averageMinutesPerUser
    };
  } catch (error) {
    console.error('Error calculating usage stats:', error);
    throw error;
  }
}
