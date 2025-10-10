import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil'
    });

    const isLiveMode = stripeKey.startsWith('sk_live');

    // Get webhook endpoints
    const webhookEndpoints = await stripe.webhookEndpoints.list({
      limit: 10
    });

    // Find the production webhook
    const prodWebhook = webhookEndpoints.data.find(ep =>
      ep.url.includes('talktotext.ca/api/billing/webhook')
    );

    // Get recent events to check processing
    const recentEvents = await stripe.events.list({
      limit: 10,
      types: ['checkout.session.completed', 'payment_intent.succeeded']
    });

    // Analyze webhook status
    const analysis = {
      mode: isLiveMode ? 'LIVE' : 'TEST',
      webhookConfigured: !!prodWebhook,
      webhookDetails: prodWebhook ? {
        url: prodWebhook.url,
        enabled: prodWebhook.status === 'enabled',
        enabledEvents: prodWebhook.enabled_events.length,
        created: new Date(prodWebhook.created * 1000).toISOString(),
      } : null,
      recentPayments: recentEvents.data.map(event => ({
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        pendingWebhooks: event.pending_webhooks,
        id: event.id
      })),
      health: {
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        endpointUrl: process.env.NEXT_PUBLIC_APP_URL ?
          `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/webhook` :
          'Not configured',
        recommendation: ''
      }
    };

    // Generate recommendations
    if (!prodWebhook) {
      analysis.health.recommendation = '❌ No webhook found for talktotext.ca - create one in Stripe Dashboard';
    } else if (prodWebhook.status !== 'enabled') {
      analysis.health.recommendation = '⚠️ Webhook is disabled - enable it in Stripe Dashboard';
    } else if (recentEvents.data.some(e => e.pending_webhooks > 0)) {
      analysis.health.recommendation = '⚠️ Some recent events have pending webhooks - check Stripe Dashboard for failures';
    } else {
      analysis.health.recommendation = '✅ Webhook appears to be healthy';
    }

    // Check last successful webhook
    const successfulEvents = recentEvents.data.filter(e => e.pending_webhooks === 0);
    if (successfulEvents.length > 0) {
      analysis.lastSuccessfulWebhook = {
        eventId: successfulEvents[0].id,
        type: successfulEvents[0].type,
        time: new Date(successfulEvents[0].created * 1000).toISOString(),
        timeAgo: Math.round((Date.now() - successfulEvents[0].created * 1000) / 1000 / 60) + ' minutes ago'
      };
    }

    return NextResponse.json({
      ...analysis,
      nextSteps: isLiveMode ? [
        '1. Wait for a real customer payment',
        '2. Check if webhook shows 200 OK in Stripe Dashboard',
        '3. Verify balance updates in your database',
        '4. If failures continue, check Vercel function logs'
      ] : [
        '1. Use Stripe CLI to test webhooks locally',
        '2. Run: stripe listen --forward-to localhost:3000/api/billing/webhook',
        '3. Make test payments with card 4242 4242 4242 4242'
      ]
    });

  } catch (error) {
    console.error('[Webhook Health] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check webhook health'
    }, { status: 500 });
  }
}