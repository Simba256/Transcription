/**
 * Get Subscription API
 * GET /api/subscriptions/get
 *
 * Retrieves the authenticated user's active subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserSubscription } from '@/lib/services/subscription.service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get user's active subscription
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        message: 'No active subscription found',
      });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        planType: subscription.planType,
        status: subscription.status,
        minutesIncluded: subscription.minutesIncluded,
        minutesUsed: subscription.minutesUsed,
        minutesRemaining: subscription.minutesRemaining,
        priceMonthly: subscription.priceMonthly,
        currency: subscription.currency,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEnd: subscription.trialEnd,
        trialMinutesUsed: subscription.trialMinutesUsed,
        createdAt: subscription.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[Get Subscription] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to get subscription',
      },
      { status: 500 }
    );
  }
}
