import { NextResponse } from 'next/server';

export async function GET() {
  const environment = {
    // Environment info
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,

    // URLs
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    vercelUrl: process.env.VERCEL_URL,

    // Stripe configuration check (without exposing secrets)
    stripe: {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' :
                     process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'UNKNOWN',
      hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      publishableKeyType: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live') ? 'LIVE' :
                          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test') ? 'TEST' : 'UNKNOWN',
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
    },

    // Pricing tables
    pricingTables: {
      ai: !!process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_AI,
      hybrid: !!process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_HYBRID,
      human: !!process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_HUMAN,
    },

    // Firebase check
    firebase: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      publicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },

    // Speechmatics check
    speechmatics: {
      hasApiKey: !!process.env.SPEECHMATICS_API_KEY,
      apiUrl: process.env.SPEECHMATICS_API_URL,
    },

    // Expected webhook URL for this environment
    expectedWebhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET'}/api/billing/webhook`,

    // Deployment info
    deployment: {
      url: typeof window !== 'undefined' ? window.location.origin : 'server-side',
      timestamp: new Date().toISOString(),
    }
  };

  // Add warnings for common issues
  const warnings = [];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('❌ STRIPE_WEBHOOK_SECRET is missing - webhooks will fail!');
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('⚠️ NEXT_PUBLIC_APP_URL is not set');
  }

  if (environment.stripe.secretKeyType !== environment.stripe.publishableKeyType) {
    warnings.push('⚠️ Stripe key mismatch - secret and publishable keys are from different environments');
  }

  if (process.env.NODE_ENV === 'production' && environment.stripe.secretKeyType !== 'LIVE') {
    warnings.push('⚠️ Using TEST Stripe keys in production environment');
  }

  if (process.env.NODE_ENV !== 'production' && environment.stripe.secretKeyType === 'LIVE') {
    warnings.push('⚠️ Using LIVE Stripe keys in non-production environment');
  }

  return NextResponse.json({
    environment,
    warnings,
    recommendation: warnings.length === 0
      ? '✅ Configuration looks good!'
      : '⚠️ Please address the warnings above',
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}