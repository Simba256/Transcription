import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  const speechmaticsJobId = url.searchParams.get('speechmaticsJobId');

  if (!speechmaticsJobId) {
    return NextResponse.json({
      error: 'Please provide speechmaticsJobId parameter',
      example: '/api/debug/check-speechmatics-job?speechmaticsJobId=6ejai5qw2h'
    }, { status: 400 });
  }

  const apiKey = process.env.SPEECHMATICS_API_KEY;
  const apiUrl = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';

  if (!apiKey) {
    return NextResponse.json({
      error: 'SPEECHMATICS_API_KEY not configured'
    }, { status: 500 });
  }

  try {
    // Check job status
    console.log(`[Debug] Checking Speechmatics job: ${speechmaticsJobId}`);

    const statusResponse = await fetch(`${apiUrl}/jobs/${speechmaticsJobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      return NextResponse.json({
        error: 'Failed to fetch job status',
        status: statusResponse.status,
        message: errorText
      }, { status: statusResponse.status });
    }

    const jobData = await statusResponse.json();

    // Extract relevant information
    const jobInfo = {
      speechmaticsJobId: speechmaticsJobId,
      status: jobData.job?.status,
      created_at: jobData.job?.created_at,
      duration: jobData.job?.duration,
      data_name: jobData.job?.data_name,
      transcription_config: jobData.job?.config?.transcription_config,
      notification_config: jobData.job?.config?.notification_config,
    };

    // Check if transcript is available
    let transcriptAvailable = false;
    let transcriptSample = null;

    if (jobData.job?.status === 'done') {
      try {
        const transcriptResponse = await fetch(`${apiUrl}/jobs/${speechmaticsJobId}/transcript?format=txt`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (transcriptResponse.ok) {
          transcriptAvailable = true;
          const transcriptText = await transcriptResponse.text();
          transcriptSample = transcriptText.substring(0, 200) + (transcriptText.length > 200 ? '...' : '');
        }
      } catch (error) {
        console.error('[Debug] Error fetching transcript:', error);
      }
    }

    // Check webhook configuration
    const webhookInfo = jobData.job?.config?.notification_config?.[0];
    const webhookUrl = webhookInfo?.url;
    let webhookReachability = null;

    if (webhookUrl) {
      // Extract base URL from webhook URL
      const webhookBaseUrl = new URL(webhookUrl).origin;

      try {
        // Try to reach the base domain
        const reachResponse = await fetch(`${webhookBaseUrl}/api/speechmatics/callback`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Speechmatics-Debug-Check'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        webhookReachability = {
          reachable: reachResponse.ok,
          status: reachResponse.status,
          baseUrl: webhookBaseUrl
        };
      } catch (error) {
        webhookReachability = {
          reachable: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          baseUrl: webhookBaseUrl
        };
      }
    }

    const analysis = {
      jobStatus: jobInfo.status,
      issues: [],
      recommendations: []
    };

    // Analyze potential issues
    if (jobInfo.status === 'done' && !transcriptAvailable) {
      analysis.issues.push('Job is done but transcript not available');
    }

    if (jobInfo.status === 'rejected') {
      analysis.issues.push('Job was rejected by Speechmatics');
      analysis.recommendations.push('Check audio file format and quality');
    }

    if (webhookUrl && !webhookUrl.includes('https://')) {
      analysis.issues.push('Webhook URL is not using HTTPS');
    }

    if (webhookReachability && !webhookReachability.reachable) {
      analysis.issues.push('Webhook endpoint appears unreachable from external services');
      analysis.recommendations.push('Check if preview deployments are publicly accessible');
      analysis.recommendations.push('Consider using a webhook relay service like ngrok or webhook.site for testing');
    }

    if (!webhookInfo?.contents?.includes('jobinfo') && !webhookInfo?.contents?.includes('transcript')) {
      analysis.issues.push('Webhook notification contents might be misconfigured');
      analysis.recommendations.push('Ensure webhook contents include at least "jobinfo"');
    }

    // Add general recommendations
    if (jobInfo.status === 'done') {
      analysis.recommendations.push('Check Vercel Function logs for webhook receipt');
      analysis.recommendations.push('Look for "[Speechmatics Webhook] WEBHOOK RECEIVED" in logs');
    }

    if (jobInfo.status === 'running') {
      analysis.recommendations.push('Job is still processing, wait a few more minutes');
      analysis.recommendations.push(`Check again in ${Math.ceil(jobInfo.duration || 60)} seconds`);
    }

    return NextResponse.json({
      job: jobInfo,
      transcript: {
        available: transcriptAvailable,
        sample: transcriptSample
      },
      webhook: {
        configured: !!webhookUrl,
        url: webhookUrl,
        reachability: webhookReachability
      },
      analysis,
      debug: {
        firebaseJobId: jobId,
        checkTime: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('[Debug] Error checking Speechmatics job:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check job',
      speechmaticsJobId
    }, { status: 500 });
  }
}