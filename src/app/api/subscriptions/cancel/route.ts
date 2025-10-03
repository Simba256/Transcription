/**
 * Cancel Subscription API
 * POST /api/subscriptions/cancel
 *
 * Cancels an existing subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { validateRequestBody } from '@/lib/validation/schemas';
import { CancelSubscriptionSchema } from '@/lib/validation/schemas';
import { cancelSubscription, getSubscription } from '@/lib/services/subscription.service';

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
    const validation = await validateRequestBody(request, CancelSubscriptionSchema);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { subscriptionId, immediate, cancellationReason } = validation.data;

    // Verify subscription belongs to user
    const subscription = await getSubscription(subscriptionId);
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Cancel subscription
    const canceledSubscription = await cancelSubscription(
      subscriptionId,
      immediate,
      cancellationReason
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancelAtPeriodEnd,
        currentPeriodEnd: canceledSubscription.currentPeriodEnd,
        canceledAt: canceledSubscription.canceledAt,
      },
      message: immediate
        ? 'Subscription canceled immediately'
        : 'Subscription will cancel at the end of the current billing period',
    });
  } catch (error: any) {
    console.error('[Cancel Subscription] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to cancel subscription',
      },
      { status: 500 }
    );
  }
}
