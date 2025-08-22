import { NextRequest, NextResponse } from 'next/server';
import { speechmaticsService } from '@/lib/speechmatics';
import { requireAuth, validateInput, rateLimit } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting (per user)
    const rateLimitResult = rateLimit(`transcript-${userId}`, 20, 60000); // 20 requests per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const format = searchParams.get('format') as 'json-v2' | 'txt' | 'srt' || 'json-v2';

    // Input validation
    const validationResult = validateInput(
      { jobId, format },
      {
        jobId: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        format: { type: 'string', pattern: /^(json-v2|txt|srt)$/ }
      }
    );
    if (!validationResult.success) {
      return validationResult.error;
    }

    // Get transcription document to verify ownership and get Speechmatics job ID
    const transcriptionDoc = await getDoc(doc(db, 'transcriptions', jobId!));
    
    if (!transcriptionDoc.exists()) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const transcriptionData = transcriptionDoc.data();
    
    // Authorization - check if user owns this transcription
    if (transcriptionData?.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this transcription' },
        { status: 403 }
      );
    }

    // Check if transcription is completed
    if (transcriptionData?.status !== 'completed') {
      return NextResponse.json(
        { error: 'Transcription not yet completed' },
        { status: 400 }
      );
    }

    const speechmaticsJobId = transcriptionData?.speechmaticsJobId;
    if (!speechmaticsJobId) {
      return NextResponse.json(
        { error: 'No Speechmatics job ID found for this transcription' },
        { status: 400 }
      );
    }

    const transcript = await speechmaticsService.getTranscriptDirect(speechmaticsJobId, format!);
    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Transcript retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcript retrieval failed' },
      { status: 500 }
    );
  }
}