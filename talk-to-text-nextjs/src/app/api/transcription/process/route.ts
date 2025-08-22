import { NextRequest, NextResponse } from 'next/server';
import { speechmaticsService } from '@/lib/speechmatics';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { requireAuth, requireOwnership, validateInput, rateLimit } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting (per user)
    const rateLimitResult = rateLimit(userId, 5, 300000); // 5 requests per 5 minutes
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const fileName = formData.get('fileName') as string;
    const firestoreDocId = formData.get('firestoreDocId') as string;
    const language = formData.get('language') as string || 'en';
    const diarization = formData.get('diarization') === 'true';

    // Input validation
    const validationResult = validateInput(
      { fileName, firestoreDocId, language },
      {
        fileName: { required: true, type: 'string', minLength: 1, maxLength: 255 },
        firestoreDocId: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        language: { required: true, type: 'string', pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }
      }
    );
    if (!validationResult.success) {
      return validationResult.error;
    }

    // File validation
    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: 'Valid audio file is required' },
        { status: 400 }
      );
    }

    // File type validation
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-wav'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: MP3, WAV, MP4, M4A' },
        { status: 400 }
      );
    }

    // File size validation (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 100MB' },
        { status: 400 }
      );
    }

    // Authorization - check if user owns the transcription document
    const ownershipResult = await requireOwnership(userId, 'transcription', firestoreDocId);
    if (!ownershipResult.success) {
      return ownershipResult.error;
    }

    // Convert File to Buffer for server-side processing
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const config = {
      type: 'transcription',
      transcription_config: {
        language,
        ...(diarization && { diarization: 'speaker' as const })
      }
    };

    // Submit job to Speechmatics
    const result = await speechmaticsService.submitTranscriptionJob(
      buffer,
      fileName,
      config
    );

    // Update Firestore with job ID and processing status
    const jobDoc = doc(db, 'transcriptions', firestoreDocId);
    await updateDoc(jobDoc, {
      speechmaticsJobId: result.job_id,
      status: 'processing',
      submittedAt: serverTimestamp()
    });

    // Start background polling
    pollJobInBackground(result.job_id, firestoreDocId);

    return NextResponse.json({ 
      success: true,
      jobId: result.job_id,
      firestoreDocId
    });

  } catch (error) {
    console.error('Transcription processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

// Background polling function
async function pollJobInBackground(speechmaticsJobId: string, firestoreDocId: string) {
  const maxAttempts = 60; // 30 minutes max (30 seconds * 60)
  let attempts = 0;

  const poll = async () => {
    try {
      if (attempts >= maxAttempts) {
        console.log(`Polling timeout for job ${speechmaticsJobId}`);
        await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
          status: 'error',
          error: 'Polling timeout exceeded',
          errorAt: serverTimestamp()
        });
        return;
      }

      const job = await speechmaticsService.getJobStatusDirect(speechmaticsJobId);
      
      if (!job || !job.status) {
        console.warn(`Invalid job status for ${speechmaticsJobId}:`, job);
        attempts++;
        setTimeout(poll, 30000); // Retry in 30 seconds
        return;
      }

      // Update Firestore with current status
      await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
        speechmaticsStatus: job.status,
        lastCheckedAt: serverTimestamp()
      });

      if (job.status === 'done') {
        try {
          // Get transcript
          const transcript = await speechmaticsService.getTranscriptDirect(speechmaticsJobId, 'json-v2');
          const transcriptText = speechmaticsService.extractTextFromTranscript(transcript);
          
          // Update Firestore with completed transcript
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'completed',
            transcript: transcriptText,
            fullTranscript: transcript,
            completedAt: serverTimestamp(),
            duration: job.duration
          });

          console.log(`Job ${speechmaticsJobId} completed successfully`);
        } catch (transcriptError) {
          console.error('Error retrieving transcript:', transcriptError);
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'error',
            error: 'Failed to retrieve transcript',
            errorAt: serverTimestamp()
          });
        }
        return; // Stop polling
      } else if (job.status === 'rejected') {
        await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
          status: 'error',
          error: 'Job rejected by Speechmatics',
          errorAt: serverTimestamp()
        });
        return; // Stop polling
      }

      // Continue polling if still running
      attempts++;
      setTimeout(poll, 30000); // Poll every 30 seconds

    } catch (error) {
      console.error(`Polling error for job ${speechmaticsJobId}:`, error);
      attempts++;
      
      if (attempts >= maxAttempts) {
        await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
          status: 'error',
          error: 'Polling failed repeatedly',
          errorAt: serverTimestamp()
        });
      } else {
        setTimeout(poll, 30000); // Retry in 30 seconds
      }
    }
  };

  // Start polling after a short delay
  setTimeout(poll, 5000); // Wait 5 seconds before first poll
}