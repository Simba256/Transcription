import { NextRequest, NextResponse } from 'next/server';
import { speechmaticsService } from '@/lib/speechmatics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const format = searchParams.get('format') as 'json-v2' | 'txt' | 'srt' || 'json-v2';

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const transcript = await speechmaticsService.getTranscript(jobId, format);
    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Transcript retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcript retrieval failed' },
      { status: 500 }
    );
  }
}