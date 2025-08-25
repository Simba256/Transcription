import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { creditService } from '@/lib/credit-service';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout session completed:', session.id);
  
  const userId = session.client_reference_id;
  const packageId = session.metadata?.packageId;
  const credits = session.metadata?.credits;
  
  if (!userId || !packageId || !credits) {
    console.error('Missing required metadata in session:', session.metadata);
    return;
  }

  try {
    // Find the purchase record
    const purchase = await creditService.getCreditPurchaseBySessionId(session.id);
    if (!purchase) {
      console.error('Purchase record not found for session:', session.id);
      return;
    }

    // Update purchase status
    await creditService.updateCreditPurchaseStatus(
      purchase.id!,
      'completed',
      session.payment_intent as string
    );

    // Add credits to user balance
    await creditService.addCredits(
      userId,
      parseInt(credits),
      `Credit purchase: ${packageId}`,
      session.payment_intent as string,
      packageId
    );

    console.log(`✅ Successfully processed credit purchase for user ${userId}: ${credits} credits`);
    
  } catch (error) {
    console.error('Error processing checkout session:', error);
    
    // Update purchase status to failed
    try {
      const purchase = await creditService.getCreditPurchaseBySessionId(session.id);
      if (purchase?.id) {
        await creditService.updateCreditPurchaseStatus(purchase.id, 'failed');
      }
    } catch (updateError) {
      console.error('Error updating purchase status to failed:', updateError);
    }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  // Additional processing if needed
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  // Find purchases related to this payment intent and mark as failed
  try {
    // This would require additional querying logic if needed
    console.log('Handling failed payment intent:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling failed payment intent:', error);
  }
}