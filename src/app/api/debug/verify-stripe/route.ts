import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const testMode = url.searchParams.get('test') === 'true';

    // Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({
        error: 'Stripe secret key not configured'
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil'
    });

    const isTestMode = stripeKey.startsWith('sk_test');

    // Configuration check
    const configuration = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
      stripe: {
        mode: isTestMode ? 'TEST' : 'LIVE',
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
      }
    };

    // Get recent payments from Stripe (last 10)
    const payments = await stripe.paymentIntents.list({
      limit: 10,
      expand: ['data.charges']
    });

    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 10
    });

    // Check webhook endpoints
    const webhookEndpoints = await stripe.webhookEndpoints.list({
      limit: 10
    });

    // Get recent events
    const events = await stripe.events.list({
      limit: 20,
      types: ['checkout.session.completed', 'payment_intent.succeeded', 'payment_intent.failed']
    });

    // Check recent transactions in Firebase
    let firebaseTransactions = [];
    try {
      const transactionsSnapshot = await adminDb.collection('transactions')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      firebaseTransactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));
    } catch (error) {
      console.error('Error fetching Firebase transactions:', error);
    }

    // Analyze webhook health
    const webhookAnalysis = {
      totalEndpoints: webhookEndpoints.data.length,
      endpoints: webhookEndpoints.data.map(endpoint => ({
        url: endpoint.url,
        enabled: endpoint.enabled_events.length > 0,
        status: endpoint.status,
        created: new Date(endpoint.created * 1000).toISOString(),
        events: endpoint.enabled_events
      })),
      expectedUrl: `${configuration.environment.appUrl}/api/billing/webhook`,
      hasCorrectEndpoint: webhookEndpoints.data.some(ep =>
        ep.url.includes('/api/billing/webhook') && ep.status === 'enabled'
      )
    };

    // Analyze recent payment success
    const recentPayments = payments.data.map(payment => ({
      id: payment.id,
      amount: (payment.amount / 100).toFixed(2),
      currency: payment.currency,
      status: payment.status,
      created: new Date(payment.created * 1000).toISOString(),
      metadata: payment.metadata
    }));

    // Check if payments are reflected in Firebase
    const paymentTracking = recentPayments.map(payment => {
      const inFirebase = firebaseTransactions.some(
        t => t.paymentIntentId === payment.id || t.sessionId === payment.id
      );
      return {
        paymentId: payment.id,
        amount: payment.amount,
        created: payment.created,
        reflectedInDatabase: inFirebase
      };
    });

    // Recent webhook events
    const recentWebhookEvents = events.data.map(event => ({
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
      pending_webhooks: event.pending_webhooks,
      request: event.request
    }));

    // Generate recommendations
    const issues = [];
    const recommendations = [];

    if (!configuration.stripe.hasWebhookSecret) {
      issues.push('❌ STRIPE_WEBHOOK_SECRET not configured');
      recommendations.push('Add webhook signing secret from Stripe Dashboard to Vercel env vars');
    }

    if (!webhookAnalysis.hasCorrectEndpoint) {
      issues.push('❌ No active webhook endpoint found for /api/billing/webhook');
      recommendations.push(`Create webhook endpoint in Stripe Dashboard pointing to: ${configuration.environment.appUrl}/api/billing/webhook`);
    }

    const unreflectedPayments = paymentTracking.filter(p => !p.reflectedInDatabase);
    if (unreflectedPayments.length > 0) {
      issues.push(`⚠️ ${unreflectedPayments.length} payments not reflected in database`);
      recommendations.push('Check webhook logs in Stripe Dashboard for delivery failures');
      recommendations.push('Verify STRIPE_WEBHOOK_SECRET matches the one in Stripe Dashboard');
    }

    const failedEvents = recentWebhookEvents.filter(e => e.pending_webhooks > 0);
    if (failedEvents.length > 0) {
      issues.push(`⚠️ ${failedEvents.length} events have pending webhook deliveries`);
      recommendations.push('Check Stripe Dashboard → Developers → Webhooks → Failed attempts');
    }

    if (issues.length === 0) {
      recommendations.push('✅ Stripe integration appears to be working correctly');
    }

    return NextResponse.json({
      configuration,
      webhooks: webhookAnalysis,
      recentPayments: {
        count: recentPayments.length,
        payments: recentPayments.slice(0, 5), // Show only first 5
        trackingStatus: paymentTracking
      },
      recentSessions: {
        count: sessions.data.length,
        sessions: sessions.data.slice(0, 5).map(s => ({
          id: s.id,
          amount: ((s.amount_total || 0) / 100).toFixed(2),
          currency: s.currency,
          payment_status: s.payment_status,
          status: s.status,
          created: new Date(s.created * 1000).toISOString(),
          metadata: s.metadata
        }))
      },
      firebaseTransactions: {
        count: firebaseTransactions.length,
        recent: firebaseTransactions.slice(0, 5).map(t => ({
          id: t.id,
          userId: t.userId,
          type: t.type,
          amount: t.amount,
          createdAt: t.createdAt
        }))
      },
      webhookEvents: {
        count: recentWebhookEvents.length,
        recent: recentWebhookEvents.slice(0, 5)
      },
      analysis: {
        issues,
        recommendations
      },
      testInstructions: isTestMode ? {
        message: 'You are in TEST mode. To test a payment:',
        steps: [
          '1. Use test card: 4242 4242 4242 4242',
          '2. Any future expiry date and any CVC',
          '3. Make a small payment',
          '4. Refresh this page to see if it appears'
        ]
      } : null
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('[Verify Stripe] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to verify Stripe configuration',
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 });
  }
}

// POST endpoint to simulate a test webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount = 50, userId = 'test-user-123' } = body;

    // Create a test webhook payload
    const testPayload = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_' + Date.now(),
          amount_total: amount * 100, // Convert to cents
          currency: 'cad',
          payment_status: 'paid',
          metadata: {
            userId,
            type: 'wallet',
            test: 'true'
          }
        }
      }
    };

    // Get the webhook URL
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const webhookUrl = `${protocol}://${host}/api/billing/webhook`;

    // Send test webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature' // This will fail signature verification but will test connectivity
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();

    return NextResponse.json({
      testResult: {
        webhookUrl,
        payloadSent: testPayload,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        },
        message: response.status === 400 && responseText.includes('signature')
          ? 'Webhook endpoint is reachable but signature verification failed (expected for test)'
          : response.status === 200
          ? 'Webhook processed successfully'
          : 'Webhook endpoint returned unexpected response'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to test webhook'
    }, { status: 500 });
  }
}