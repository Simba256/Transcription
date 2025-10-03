/**
 * Update Subscription API
 * POST /api/subscriptions/update
 *
 * Updates an existing subscription (change plan)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { validateRequestBody } from '@/lib/validation/schemas';
import { UpdateSubscriptionSchema } from '@/lib/validation/schemas';
import { updateSubscription, getSubscription } from '@/lib/services/subscription.service';

export async function POST(request: NextRequest) {
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

    // Validate request body
    const validation = await validateRequestBody(request, UpdateSubscriptionSchema);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { subscriptionId, newPlanId, prorate } = validation.data;

    // Verify subscription belongs to user
    const subscription = await getSubscription(subscriptionId);
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update subscription
    const updatedSubscription = await updateSubscription(subscriptionId, newPlanId, prorate);

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        planId: updatedSubscription.planId,
        planType: updatedSubscription.planType,
        status: updatedSubscription.status,
        minutesIncluded: updatedSubscription.minutesIncluded,
        minutesRemaining: updatedSubscription.minutesRemaining,
        priceMonthly: updatedSubscription.priceMonthly,
        currency: updatedSubscription.currency,
        currentPeriodStart: updatedSubscription.currentPeriodStart,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
    });
  } catch (error: any) {
    console.error('[Update Subscription] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to update subscription',
      },
      { status: 500 }
    );
  }
}
