import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Speechmatics API key not configured' }, { status: 500 });
    }

    console.log(`[Debug] Checking Speechmatics job status for: ${jobId}`);

    const response = await fetch(`https://asr.api.speechmatics.com/v2/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const statusData = await response.json();

    console.log(`[Debug] Speechmatics job ${jobId} status:`, statusData);

    return NextResponse.json({
      success: true,
      jobId,
      status: response.status,
      data: statusData
    });

  } catch (error) {
    console.error('[Debug] Error checking Speechmatics status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}