import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebase/admin';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { CreatePaymentIntentSchema, validateRequestBody } from '@/lib/validation/schemas';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResponse = await rateLimiters.billing(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Validate request body using Zod schema
    const validation = await validateRequestBody(request, CreatePaymentIntentSchema);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const { packageId, amount, credits } = validation.data;

    // Package validation
    const validPackages = {
      starter: { credits: 1000, price: 10, name: 'Starter Pack' },
      professional: { credits: 5000, price: 45, name: 'Professional Pack' },
      enterprise: { credits: 12000, price: 100, name: 'Enterprise Pack' }
    };

    const packageInfo = validPackages[packageId as keyof typeof validPackages];
    if (!packageInfo) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    if (amount !== packageInfo.price || credits !== packageInfo.credits) {
      return NextResponse.json(
        { error: 'Package details do not match' },
        { status: 400 }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: decodedToken.uid,
        packageId,
        credits: credits.toString(),
        userEmail: decodedToken.email || '',
      },
      description: `${packageInfo.name} - ${credits} credits`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}