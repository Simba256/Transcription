import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getTranscriptionByIdAdmin } from '@/lib/firebase/transcriptions-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const jobId = params.id;
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get the transcription job
    const transcriptionJob = await getTranscriptionByIdAdmin(jobId);

    if (!transcriptionJob) {
      return NextResponse.json(
        { error: 'Transcription job not found' },
        { status: 404 }
      );
    }

    // Verify user owns this job (unless admin)
    if (transcriptionJob.userId !== decodedToken.uid && decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Return job status and relevant data
    const response = {
      id: jobId,
      status: transcriptionJob.status,
      mode: transcriptionJob.mode,
      filename: transcriptionJob.originalFilename,
      duration: transcriptionJob.duration,
      creditsUsed: transcriptionJob.creditsUsed,
      createdAt: transcriptionJob.createdAt,
      updatedAt: transcriptionJob.updatedAt,
      completedAt: transcriptionJob.completedAt || null,
      speechmaticsJobId: transcriptionJob.speechmaticsJobId || null,
      // Include transcript only if job is complete
      ...(transcriptionJob.status === 'complete' && {
        transcript: transcriptionJob.transcript,
        timestampedTranscript: transcriptionJob.timestampedTranscript
      }),
      // Include error details if job failed
      ...(transcriptionJob.status === 'failed' && {
        error: transcriptionJob.specialInstructions
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] Error fetching transcription status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}