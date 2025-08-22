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
    const rateLimitResult = rateLimit(`status-${userId}`, 30, 60000); // 30 requests per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    // Input validation
    const validationResult = validateInput(
      { jobId },
      {
        jobId: { required: true, type: 'string', minLength: 1, maxLength: 100 }
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

    const speechmaticsJobId = transcriptionData?.speechmaticsJobId;
    if (!speechmaticsJobId) {
      // Return Firestore status if no Speechmatics job ID yet
      return NextResponse.json({
        id: jobId,
        status: transcriptionData?.status || 'pending',
        created_at: transcriptionData?.createdAt?.toDate?.()?.toISOString(),
        data_name: transcriptionData?.fileName
      });
    }

    const status = await speechmaticsService.getJobStatusDirect(speechmaticsJobId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}