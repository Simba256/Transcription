import { NextRequest, NextResponse } from 'next/server';
// Ensure this route runs on Node.js runtime (Buffer, axios, Firebase SDK compatibility)
export const runtime = 'nodejs';
import { speechmaticsService } from '@/lib/speechmatics/service';
import { getTranscriptionByIdAdmin, updateTranscriptionStatusAdmin, TranscriptionMode } from '@/lib/firebase/transcriptions-admin';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { ProcessTranscriptionJobSchema, validateData } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResponse = await rateLimiters.transcription(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Force recompilation to ensure latest Speechmatics changes are loaded

  try {
    console.log('[API] Processing transcription request received');

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = validateData(body, ProcessTranscriptionJobSchema);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const { jobId, language, operatingPoint } = validation.data;

    console.log(`[API] Processing request for job: ${jobId}, language: ${language}, operatingPoint: ${operatingPoint}`);

    // Check if Speechmatics is configured
    console.log(`[API] Checking if Speechmatics is ready...`);
    if (!speechmaticsService.isReady()) {
      console.warn(`[API] Speechmatics not configured for job ${jobId}. Marking as pending.`);
      
      // Update job status to indicate manual processing needed
      await updateTranscriptionStatusAdmin(jobId, 'pending-transcription', {
        specialInstructions: 'Speechmatics API not configured - requires manual processing'
      });
      
      return NextResponse.json({
        success: false,
        message: 'Speechmatics API not configured. Job marked for manual processing.',
        jobId,
        status: 'pending-transcription'
      }, { status: 200 }); // Return 200 since it's not really an error
    }

    console.log(`[API] Speechmatics is ready, proceeding with job ${jobId}`);

    // Get the transcription job details
    const transcriptionJob = await getTranscriptionByIdAdmin(jobId);
    
    if (!transcriptionJob) {
      return NextResponse.json(
        { error: 'Transcription job not found' },
        { status: 404 }
      );
    }

    // Only process AI and hybrid mode jobs
    if (!['ai', 'hybrid'].includes(transcriptionJob.mode)) {
      return NextResponse.json(
        { error: 'This endpoint only processes AI and hybrid transcription jobs' },
        { status: 400 }
      );
    }

    // Check if job is already completed 
    if (['complete', 'pending-review'].includes(transcriptionJob.status)) {
      return NextResponse.json(
        { error: `Job is already ${transcriptionJob.status}` },
        { status: 400 }
      );
    }

    // Only process jobs that are in processing status or failed (for retry)
    if (!['processing', 'failed'].includes(transcriptionJob.status)) {
      return NextResponse.json(
        { error: `Cannot process job with status: ${transcriptionJob.status}. Expected 'processing' or 'failed'.` },
        { status: 400 }
      );
    }

    console.log(`[API] Processing transcription job ${jobId} with mode: ${transcriptionJob.mode}`);

    // Ensure status is processing (in case it was failed and we're retrying)
    if (transcriptionJob.status === 'failed') {
      await updateTranscriptionStatusAdmin(jobId, 'processing');
    }

    // Download the audio file from Firebase Storage
    const audioBuffer = await downloadAudioFile(transcriptionJob.downloadURL);
    
    if (!audioBuffer) {
      await updateTranscriptionStatusAdmin(jobId, 'failed', {
        specialInstructions: 'Failed to download audio file'
      });
      
      return NextResponse.json(
        { error: 'Failed to download audio file' },
        { status: 500 }
      );
    }

    // Process with Speechmatics in the background
    // Note: In production, you'd want to use a queue system like Bull or similar
    processTranscriptionAsync(jobId, audioBuffer, transcriptionJob.originalFilename, {
      language,
      operatingPoint,
      enableDiarization: true,
      enablePunctuation: true
    }, transcriptionJob.mode);

    return NextResponse.json({
      success: true,
      message: 'Transcription processing started',
      jobId,
      status: 'processing'
    });

  } catch (error) {
    console.error('[API] Error processing transcription job:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process transcription job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Download audio file from Firebase Storage URL
 */
async function downloadAudioFile(downloadURL: string): Promise<Buffer | null> {
  try {
    console.log(`[API] Downloading audio file from: ${downloadURL}`);
    
    const response = await fetch(downloadURL);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
    
  } catch (error) {
    console.error('[API] Error downloading audio file:', error);
    return null;
  }
}

/**
 * Process transcription asynchronously
 */
async function processTranscriptionAsync(
  jobId: string,
  audioBuffer: Buffer,
  filename: string,
  speechmaticsConfig: any,
  mode: TranscriptionMode
): Promise<void> {
  try {
    console.log(`[API] Starting async processing for job ${jobId}`);
    
    const result = await speechmaticsService.transcribeAudio(
      audioBuffer,
      filename,
      speechmaticsConfig
    );

    console.log(`[API Route] transcribeAudio result for ${jobId}:`, {
      success: result.success,
      hasTranscript: !!result.transcript,
      transcriptLength: result.transcript?.length || 0,
      hasTimestampedTranscript: !!result.timestampedTranscript,
      timestampedSegmentsCount: result.timestampedTranscript?.length || 0,
      duration: result.duration,
      error: result.error
    });

    if (result.success && result.transcript) {
      // Determine final status based on transcription mode
      const finalStatus = mode === 'hybrid' ? 'pending-review' : 'complete';

      await updateTranscriptionStatusAdmin(jobId, finalStatus, {
        transcript: result.transcript,
        timestampedTranscript: result.timestampedTranscript,
        duration: result.duration || 0
      });

      console.log(`[API] Successfully processed job ${jobId} - Status: ${finalStatus}`);
      
    } else {
      await updateTranscriptionStatusAdmin(jobId, 'failed', {
        specialInstructions: result.error || 'Speechmatics transcription failed'
      });
      
      console.error(`[API] Failed to process job ${jobId}:`, result.error);
    }
    
  } catch (error) {
    console.error(`[API] Error in async processing for job ${jobId}:`, error);
    
    await updateTranscriptionStatusAdmin(jobId, 'failed', {
      specialInstructions: 'Internal processing error'
    });
  }
}