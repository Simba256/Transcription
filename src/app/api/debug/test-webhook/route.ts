import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Test webhook URL generation
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Ensure the URL has a protocol
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }

  // Try to get the actual domain from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';

  if (host) {
    const dynamicUrl = `${protocol}://${host}`;
    baseUrl = dynamicUrl;
  }

  const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
  const testJobId = 'test-' + Date.now();
  const callbackUrl = `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${testJobId}`;

  // Test if the callback endpoint is accessible
  let callbackTestResult = {};
  try {
    const testResponse = await fetch(callbackUrl.replace('POST', 'GET'), {
      method: 'GET',
      headers: {
        'User-Agent': 'Speechmatics-Webhook-Test'
      }
    });

    callbackTestResult = {
      accessible: testResponse.ok,
      status: testResponse.status,
      response: await testResponse.text()
    };
  } catch (error) {
    callbackTestResult = {
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check Vercel logs endpoint (if available)
  const vercelLogs = process.env.VERCEL_URL ?
    `https://vercel.com/${process.env.VERCEL_URL}/functions` :
    'Check Vercel dashboard for function logs';

  return NextResponse.json({
    webhookConfiguration: {
      baseUrl,
      callbackUrl,
      token: webhookToken.substring(0, 10) + '...',
      jobId: testJobId
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    requestHeaders: {
      host,
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    },
    callbackEndpointTest: callbackTestResult,
    troubleshooting: {
      checkLogs: vercelLogs,
      tips: [
        'Check Vercel Function logs for [Speechmatics Webhook] messages',
        'Verify Speechmatics can reach your preview URL (not behind auth/firewall)',
        'Test with a webhook testing service like webhook.site',
        'Check if the job is actually being submitted to Speechmatics'
      ]
    }
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

// Test POST endpoint to simulate Speechmatics callback
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Simulate calling the actual webhook
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  const testJobId = body.jobId || 'test-job-' + Date.now();
  const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
  const webhookUrl = `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${testJobId}`;

  // Create a test payload similar to what Speechmatics would send
  const testPayload = {
    job: {
      id: 'speechmatics-' + Date.now(),
      status: 'done'
    },
    results: [
      {
        alternatives: [{
          content: 'Test',
          confidence: 0.95
        }],
        start_time: 0,
        end_time: 0.5,
        type: 'word'
      },
      {
        alternatives: [{
          content: 'transcript',
          confidence: 0.95
        }],
        start_time: 0.5,
        end_time: 1.0,
        type: 'word'
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Webhook-Simulator'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();

    return NextResponse.json({
      webhookTest: {
        url: webhookUrl,
        success: response.ok,
        status: response.status,
        response: responseText
      },
      message: 'Test webhook sent - check Vercel logs for [Speechmatics Webhook] messages'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to test webhook',
      webhookUrl
    }, { status: 500 });
  }
}