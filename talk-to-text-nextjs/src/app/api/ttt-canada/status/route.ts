import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      );
    }

    // Get job status from database/storage
    const jobStatus = await getTTTCanadaJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      ...jobStatus
    });

  } catch (error) {
    console.error('TTT Canada status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}

/**
 * Get TTT Canada job status from database
 */
async function getTTTCanadaJobStatus(jobId: string): Promise<any> {
  try {
    // Use Firebase Admin SDK for server-side operations
    const admin = await import('firebase-admin');
    const adminDb = admin.firestore();
    
    // Get job from Firestore
    const jobDoc = await adminDb.collection('ttt_canada_jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      console.log(`📄 Job ${jobId} not found in Firestore`);
      return null;
    }
    
    const jobData = jobDoc.data();
    console.log(`📄 Found job ${jobId} with status: ${jobData?.status}`);
    console.log(`📊 Retrieved job ${jobId} from Firestore with status: ${jobData.status}`);
    
    // Return job data with computed progress
    const result: any = {
      ...jobData,
      jobId
    };
    
    // Add progress calculation based on status
    switch (jobData.status) {
      case 'processing':
        result.progress = 10;
        result.stage = 'uploading';
        result.message = result.message || 'Processing file upload...';
        break;
      case 'ai_processing':
        result.progress = 45;
        result.stage = 'transcription';
        result.message = result.message || 'Generating AI transcription...';
        break;
      case 'pending_human_review':
        result.progress = 70;
        result.stage = 'human_review_queue';
        result.message = result.message || 'AI draft completed. Queued for human review.';
        result.estimatedHumanReviewTime = '1-2 hours';
        break;
      case 'completed':
        result.progress = 100;
        result.stage = 'final';
        result.message = result.message || 'Transcription completed successfully.';
        break;
      case 'failed':
        result.progress = 0;
        result.stage = 'error';
        result.message = result.message || 'Processing failed.';
        break;
      default:
        result.progress = 5;
        result.stage = 'unknown';
        result.message = result.message || 'Processing...';
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to get job status for ${jobId}:`, error);
    throw new Error('Failed to retrieve job status');
  }
  
  // Legacy simulation code below - remove the rest
  const jobCreationTime = parseInt(jobId.split('-')[2]) || Date.now();
  const ageInMinutes = (Date.now() - jobCreationTime) / (1000 * 60);
  
  console.log(`📊 Checking status for job ${jobId} (age: ${ageInMinutes.toFixed(1)} min)`);
  
  // Simulate job progression
  if (ageInMinutes < 0.5) {
    return {
      status: 'processing',
      stage: 'uploading',
      message: 'Processing file upload...',
      progress: 10
    };
  } else if (ageInMinutes < 2) {
    return {
      status: 'ai_processing', 
      stage: 'transcription',
      message: 'Generating AI transcription...',
      progress: 45
    };
  } else if (ageInMinutes < 5) {
    // For AI Human Review jobs, move to pending human review
    return {
      status: 'pending_human_review',
      stage: 'human_review_queue',
      message: 'AI draft completed. Queued for human review.',
      progress: 70,
      result: {
        aiDraft: 'This is a sample AI-generated transcript. The actual transcript would be much longer and more detailed, containing the full content of the uploaded audio file with proper formatting and Canadian English spelling conventions.',
        transcript: 'This is a sample AI-generated transcript. The actual transcript would be much longer and more detailed, containing the full content of the uploaded audio file with proper formatting and Canadian English spelling conventions.'
      },
      estimatedHumanReviewTime: '1-2 hours',
      aiDraftCompletedAt: new Date(jobCreationTime + 2 * 60 * 1000).toISOString()
    };
  } else {
    // Job completed
    return {
      status: 'completed',
      stage: 'final',
      message: 'Transcription completed successfully.',
      progress: 100,
      result: {
        transcript: 'This is the final human-reviewed transcript with professional editing, Canadian English spelling, and proper formatting. The human reviewer has corrected any errors from the AI draft and ensured the highest quality output.',
        aiDraft: 'This is a sample AI-generated transcript. The actual transcript would be much longer and more detailed, containing the full content of the uploaded audio file with proper formatting and Canadian English spelling conventions.',
        speakers: ['Speaker 1', 'Speaker 2'],
        metadata: {
          wordCount: 145,
          confidenceScore: 0.98,
          processingTime: ageInMinutes * 60 * 1000,
          serviceType: 'AI Draft + Human Review'
        }
      },
      completedAt: new Date(jobCreationTime + 5 * 60 * 1000).toISOString()
    };
  }
}