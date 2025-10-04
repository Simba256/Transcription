/**
 * Create Stripe Checkout Session for Subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/client';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { SUBSCRIPTION_PLANS } from '@/lib/plans';
import { PlanId } from '@/lib/types/subscription';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - check both Authorization header and cookies
    let authToken = request.cookies.get('authToken')?.value;

    // If not in cookies, check Authorization header
    if (!authToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
      }
    }

    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(authToken);
    const userId = decodedToken.uid;

    // Get request body
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Get plan details
    const plan = SUBSCRIPTION_PLANS[planId as PlanId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    if (!plan.stripePriceId) {
      return NextResponse.json({ error: 'Plan is missing Stripe price ID' }, { status: 500 });
    }

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const email = userData?.email || decodedToken.email;
    const name = userData?.displayName || userData?.name;

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(userId, email, name);

    // Get app URL from environment or construct from request
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (request.headers.get('origin') ||
                   `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`);
    const successUrl = `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/billing?canceled=true`;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          userId,
          planId: plan.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
