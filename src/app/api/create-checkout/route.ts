import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    // Get user authentication
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: 'Authentication required',
          message: 'You must be logged in to make a payment'
        }, { status: 401 });
      }

      const headerToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(headerToken);
        return createCheckoutSession(request, decodedToken);
      } catch (error) {
        return NextResponse.json({
          error: 'Invalid authentication token'
        }, { status: 401 });
      }
    }

    // Verify cookie token
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      return createCheckoutSession(request, decodedToken);
    } catch (error) {
      return NextResponse.json({
        error: 'Session expired, please login again'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('[Create Checkout] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    }, { status: 500 });
  }
}

async function createCheckoutSession(request: NextRequest, decodedToken: any) {
  try {
    const { amount, type = 'wallet', packageData } = await request.json();

    console.log('[Create Checkout] Request:', { amount, type, packageData });

    if (!amount || amount < 1) {
      return NextResponse.json({
        error: 'Invalid amount'
      }, { status: 400 });
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    console.log(`[Create Checkout] Creating session for user ${userId} (${userEmail})`);

  // Create line items based on type
  const lineItems = type === 'package' && packageData ? [{
    price_data: {
      currency: 'cad',
      product_data: {
        name: packageData.name || 'Transcription Package',
        description: `${packageData.minutes} minutes of ${packageData.type} transcription`
      },
      unit_amount: Math.round((packageData.price || amount) * 100),
    },
    quantity: 1,
  }] : [{
    price_data: {
      currency: 'cad',
      product_data: {
        name: 'Wallet Top-up',
        description: `Add CA$${amount} to your transcription wallet`
      },
      unit_amount: Math.round(amount * 100),
    },
    quantity: 1,
  }];

    // Create Stripe checkout session with userId ALWAYS included
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || getBaseUrl(request)}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || getBaseUrl(request)}/billing?canceled=true`,
      customer_email: userEmail, // Pre-fill with account email
      metadata: {
        // ALWAYS include these - this is foolproof!
        userId: userId,
        userEmail: userEmail,
        type: type,
        // Package-specific metadata
        ...(type === 'package' && packageData ? {
          packageType: packageData.type,
          packageMinutes: String(packageData.minutes),
          packageRate: String(packageData.rate),
          packageName: packageData.name
        } : {})
      },
      // Prevent customer from changing email during checkout
      customer_creation: 'always',
      billing_address_collection: 'required',
      // Add customer's name if available
      ...(decodedToken.name ? {
        customer_data: {
          name: decodedToken.name
        }
      } : {})
    });

    console.log(`[Create Checkout] Session created: ${session.id} with metadata:`, session.metadata);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      message: 'Redirecting to secure checkout...',
      metadata: {
        userId: userId,
        email: userEmail,
        amount: amount
      }
    });
  } catch (error) {
    console.error('[Create Checkout] Session creation failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

// GET endpoint to check if authenticated
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'Please login to make payments'
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    return NextResponse.json({
      authenticated: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
      message: 'Ready to create checkout session'
    });

  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      message: 'Session expired'
    });
  }
}