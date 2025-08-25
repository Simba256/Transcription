import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateInput } from '@/lib/auth-middleware';
import { stripe } from '@/lib/stripe-server';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import { creditService } from '@/lib/credit-service';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    const body = await request.json();
    
    // Input validation
    const validationResult = validateInput(body, {
      packageId: { required: true, type: 'string', minLength: 1 },
      successUrl: { required: true, type: 'string', minLength: 1 },
      cancelUrl: { required: true, type: 'string', minLength: 1 }
    });

    if (!validationResult.success) {
      return validationResult.error;
    }

    const { packageId, successUrl, cancelUrl } = body;

    // Find the credit package
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Invalid credit package' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: creditPackage.name,
              description: `${creditPackage.credits} credits for Talk-to-Text transcription services`,
            },
            unit_amount: Math.round(creditPackage.priceCAD * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        packageId: creditPackage.id,
        userId: userId,
        credits: creditPackage.credits.toString(),
      },
    });

    // Record the pending purchase
    await creditService.recordCreditPurchase({
      userId,
      packageId: creditPackage.id,
      credits: creditPackage.credits,
      priceCAD: creditPackage.priceCAD,
      stripePaymentIntentId: '', // Will be updated by webhook
      stripeSessionId: session.id,
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Credit purchase error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Purchase failed' },
      { status: 500 }
    );
  }
}