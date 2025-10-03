/**
 * Create Subscription API
 * POST /api/subscriptions/create
 *
 * Creates a new subscription for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { validateRequestBody } from '@/lib/validation/schemas';
import { CreateSubscriptionSchema } from '@/lib/validation/schemas';
import { createSubscription } from '@/lib/services/subscription.service';

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
    const validation = await validateRequestBody(request, CreateSubscriptionSchema);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { planId, paymentMethodId } = validation.data;

    // Get user data from Firestore using Admin SDK
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Create subscription
    const result = await createSubscription(
      userId,
      userData.email,
      planId,
      paymentMethodId,
      userData.name
    );

    return NextResponse.json(
      {
        success: true,
        subscription: {
          id: result.subscription.id,
          planId: result.subscription.planId,
          planType: result.subscription.planType,
          status: result.subscription.status,
          minutesIncluded: result.subscription.minutesIncluded,
          minutesRemaining: result.subscription.minutesRemaining,
          priceMonthly: result.subscription.priceMonthly,
          currency: result.subscription.currency,
          currentPeriodStart: result.subscription.currentPeriodStart,
          currentPeriodEnd: result.subscription.currentPeriodEnd,
          trialEnd: result.subscription.trialEnd,
        },
        clientSecret: result.clientSecret,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Create Subscription] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to create subscription',
      },
      { status: 500 }
    );
  }
}
