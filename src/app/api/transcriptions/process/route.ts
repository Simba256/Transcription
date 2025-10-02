import { NextRequest, NextResponse } from 'next/server';
// Ensure this route runs on Node.js runtime (Buffer, axios, Firebase SDK compatibility)
export const runtime = 'nodejs';
// Set maxDuration to 5 minutes (300s) for Vercel deployment
export const maxDuration = 300;
import { speechmaticsService } from '@/lib/speechmatics/service';
import { getTranscriptionByIdAdmin, updateTranscriptionStatusAdmin, TranscriptionMode } from '@/lib/firebase/transcriptions-admin';
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
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

    // Choose processing method based on file duration
    // For files longer than 5 minutes, use webhook-based processing to avoid timeouts
    const useWebhook = transcriptionJob.duration > 300; // 5 minutes

    console.log(`[API] File duration: ${transcriptionJob.duration}s, using ${useWebhook ? 'webhook' : 'synchronous'} processing`);

    let result;
    if (useWebhook) {
      // Use webhook-based processing for longer files
      result = await processTranscriptionWithWebhook(
        jobId,
        audioBuffer,
        transcriptionJob.originalFilename,
        {
          language,
          operatingPoint,
          enableDiarization: true,
          enablePunctuation: true,
          speakerSensitivity: 0.6, // Higher sensitivity for better speaker detection
          domain: transcriptionJob.domain || 'general' // Use domain for specialized vocabulary
        }
      );
    } else {
      // Use synchronous processing for shorter files
      result = await processTranscriptionSynchronous(
        jobId,
        audioBuffer,
        transcriptionJob.originalFilename,
        {
          language,
          operatingPoint,
          enableDiarization: true,
          enablePunctuation: true,
          speakerSensitivity: 0.6, // Higher sensitivity for better speaker detection
          domain: transcriptionJob.domain || 'general' // Use domain for specialized vocabulary
        }
      );
    }

    if (!result.success) {
      const errorMessage = result.error || 'Failed to submit job to Speechmatics';
      let userFriendlyMessage = errorMessage;

      // Check for quota exceeded errors and provide user-friendly message
      if (errorMessage.includes('Enhanced Model transcription') && errorMessage.includes('limit')) {
        userFriendlyMessage = 'Enhanced model quota exceeded. Using standard model automatically.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        userFriendlyMessage = 'Monthly transcription quota exceeded. Please contact support or wait for next month.';
      }

      await updateTranscriptionStatusAdmin(jobId, 'failed', {
        specialInstructions: userFriendlyMessage
      });

      return NextResponse.json(
        {
          error: userFriendlyMessage,
          technicalError: errorMessage // Keep technical details for debugging
        },
        { status: 500 }
      );
    }

    // Update job with Speechmatics job ID
    await updateTranscriptionStatusAdmin(jobId, 'processing', {
      speechmaticsJobId: result.speechmaticsJobId
    });

    return NextResponse.json({
      success: true,
      message: 'Transcription job submitted successfully',
      jobId,
      speechmaticsJobId: result.speechmaticsJobId,
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
 * Process transcription synchronously (for shorter files)
 */
async function processTranscriptionSynchronous(
  jobId: string,
  audioBuffer: Buffer,
  filename: string,
  speechmaticsConfig: Record<string, unknown>
): Promise<{ success: boolean; speechmaticsJobId?: string; error?: string }> {
  try {
    console.log(`[API] Starting synchronous processing for job ${jobId}`);

    // Use the existing synchronous transcription method
    const result = await speechmaticsService.processTranscriptionJob(
      jobId,
      audioBuffer,
      filename,
      speechmaticsConfig
    );

    console.log(`[API] Synchronous processing completed for job ${jobId}`);
    return { success: true };

  } catch (error) {
    console.error(`[API] Error in synchronous processing for job ${jobId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Synchronous processing failed'
    };
  }
}

/**
 * Process transcription with webhook callback
 */
async function processTranscriptionWithWebhook(
  jobId: string,
  audioBuffer: Buffer,
  filename: string,
  speechmaticsConfig: Record<string, unknown>
): Promise<{ success: boolean; speechmaticsJobId?: string; error?: string }> {
  try {
    console.log(`[API] Starting webhook-based processing for job ${jobId}`);

    // Create callback URL with job reference
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
    const callbackUrl = `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${jobId}`;

    // Submit job to Speechmatics with webhook
    const result = await speechmaticsService.submitJobWithWebhook(
      audioBuffer,
      filename,
      speechmaticsConfig,
      callbackUrl
    );

    console.log(`[API] submitJobWithWebhook result for ${jobId}:`, {
      success: result.success,
      speechmaticsJobId: result.jobId,
      error: result.error
    });

    if (result.success && result.jobId) {
      console.log(`[API] Job ${jobId} submitted to Speechmatics with ID: ${result.jobId}`);
      return {
        success: true,
        speechmaticsJobId: result.jobId
      };
    } else {
      console.error(`[API] Failed to submit job ${jobId} to Speechmatics:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to submit job to Speechmatics'
      };
    }

  } catch (error) {
    console.error(`[API] Error submitting transcription job ${jobId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal processing error'
    };
  }
}