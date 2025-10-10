import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Determine the base URL using the same logic as transcription processing
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Ensure the URL has a protocol
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }

  // Try to get the actual domain from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  let dynamicUrl = '';

  if (host) {
    dynamicUrl = `${protocol}://${host}`;
    // Use dynamic URL if available
    if (!baseUrl || process.env.NODE_ENV === 'production') {
      baseUrl = dynamicUrl;
    }
  }

  const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
  const testJobId = 'test-job-123';

  const debugInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    headers: {
      host: host,
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    },
    urls: {
      fromEnv: process.env.NEXT_PUBLIC_APP_URL,
      withProtocol: baseUrl,
      fromHeaders: dynamicUrl,
      final: baseUrl,
    },
    webhooks: {
      speechmatics: `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${testJobId}`,
      stripe: `${baseUrl}/api/billing/webhook`,
    },
    recommendations: []
  };

  // Add recommendations
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    debugInfo.recommendations.push('❌ NEXT_PUBLIC_APP_URL is not set - add it to Vercel environment variables');
  } else if (!process.env.NEXT_PUBLIC_APP_URL.startsWith('http')) {
    debugInfo.recommendations.push('⚠️ NEXT_PUBLIC_APP_URL should include https:// protocol');
    debugInfo.recommendations.push(`📝 Change from: ${process.env.NEXT_PUBLIC_APP_URL}`);
    debugInfo.recommendations.push(`📝 Change to: https://${process.env.NEXT_PUBLIC_APP_URL}`);
  }

  if (!host) {
    debugInfo.recommendations.push('⚠️ Host header is missing - this might cause issues with webhook URLs');
  }

  if (debugInfo.recommendations.length === 0) {
    debugInfo.recommendations.push('✅ Webhook URLs look correctly configured');
  }

  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}