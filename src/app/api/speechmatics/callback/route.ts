import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    console.log('[Speechmatics Webhook] Received callback');

    // Verify webhook token for security
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const expectedToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';

    if (token !== expectedToken) {
      console.error('[Speechmatics Webhook] Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the webhook payload
    const payload = await request.json();
    console.log('[Speechmatics Webhook] Payload:', JSON.stringify(payload, null, 2));

    const { job } = payload;
    if (!job?.id) {
      console.error('[Speechmatics Webhook] Missing job ID in payload');
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }

    const speechmaticsJobId = job.id;
    const jobStatus = job.status; // 'running' | 'done' | 'rejected'

    // Check if this is a transcript delivery (results present means job is done)
    const hasTranscript = payload.results && Array.isArray(payload.results) && payload.results.length > 0;
    const effectiveStatus = hasTranscript ? 'done' : jobStatus;

    console.log(`[Speechmatics Webhook] Job ${speechmaticsJobId} status: ${jobStatus}, hasTranscript: ${hasTranscript}, effectiveStatus: ${effectiveStatus}`);

    // Find the transcription job in our database
    const transcriptionsRef = adminDb.collection('transcriptions');
    const jobQuery = await transcriptionsRef.where('speechmaticsJobId', '==', speechmaticsJobId).get();

    if (jobQuery.empty) {
      console.error(`[Speechmatics Webhook] No job found for Speechmatics ID: ${speechmaticsJobId}`);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobDoc = jobQuery.docs[0];
    const jobData = jobDoc.data();
    const jobId = jobDoc.id;

    console.log(`[Speechmatics Webhook] Found job ${jobId} for user ${jobData.userId}`);

    // Handle different job statuses
    if (effectiveStatus === 'done') {
      console.log(`[Speechmatics Webhook] Job ${jobId} completed`);

      try {
        let transcriptData;

        if (hasTranscript) {
          // Use the transcript data from the webhook payload
          transcriptData = payload;
          console.log(`[Speechmatics Webhook] Using transcript from webhook payload for job ${jobId}`);
        } else {
          // Fallback: fetch the transcript from Speechmatics API
          console.log(`[Speechmatics Webhook] Fetching transcript from API for job ${jobId}`);

          const speechmaticsApiKey = process.env.SPEECHMATICS_API_KEY;
          const speechmaticsApiUrl = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';

          if (!speechmaticsApiKey) {
            throw new Error('SPEECHMATICS_API_KEY not configured');
          }

          // Get transcript in JSON format (with timestamps)
          const transcriptResponse = await fetch(`${speechmaticsApiUrl}/jobs/${speechmaticsJobId}/transcript?format=json-v2`, {
            headers: {
              'Authorization': `Bearer ${speechmaticsApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!transcriptResponse.ok) {
            throw new Error(`Failed to fetch transcript: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
          }

          transcriptData = await transcriptResponse.json();
        }

        console.log(`[Speechmatics Webhook] Retrieved transcript for job ${jobId}`);

        // Create timestamped segments from Speechmatics results
        let timestampedSegments = [];
        console.log(`[Speechmatics Webhook] Processing results for timestamped segments. Results count: ${transcriptData.results?.length || 0}`);

        if (transcriptData.results && Array.isArray(transcriptData.results)) {
          let currentSentence = '';
          let sentenceStartTime = null;
          let sentenceEndTime = 0;

          for (const result of transcriptData.results) {
            if (result.alternatives && result.alternatives[0] && result.alternatives[0].content) {
              const word = result.alternatives[0].content;
              const startTime = result.start_time || 0;
              const endTime = result.end_time || 0;

              // Initialize sentence start time
              if (sentenceStartTime === null && result.type === 'word') {
                sentenceStartTime = startTime;
              }

              // Add word or punctuation to current sentence
              if (result.type === 'punctuation' && result.attaches_to === 'previous') {
                currentSentence += word; // Attach punctuation directly
              } else if (result.type === 'word') {
                currentSentence += (currentSentence ? ' ' : '') + word;
              }

              sentenceEndTime = endTime;

              // Check if this ends a sentence
              const endsWithPunctuation = result.type === 'punctuation' && result.is_eos;

              if (endsWithPunctuation && currentSentence.trim()) {
                // Complete the sentence segment
                timestampedSegments.push({
                  start: sentenceStartTime,
                  end: sentenceEndTime,
                  text: currentSentence.trim()
                });

                // Reset for next sentence
                currentSentence = '';
                sentenceStartTime = null;
                sentenceEndTime = 0;
              }
            }
          }

          // Handle any remaining incomplete sentence
          if (currentSentence.trim() && sentenceStartTime !== null) {
            timestampedSegments.push({
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: currentSentence.trim()
            });
          }
        }

        console.log(`[Speechmatics Webhook] Created ${timestampedSegments.length} timestamped segments for job ${jobId}`);

        // Update the job in our database
        await jobDoc.ref.update({
          status: 'complete',
          transcript: transcriptData,
          timestampedTranscript: timestampedSegments,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`[Speechmatics Webhook] Job ${jobId} marked as complete`);

      } catch (error) {
        console.error(`[Speechmatics Webhook] Error processing transcript for job ${jobId}:`, error);

        // Mark job as failed
        await jobDoc.ref.update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to process transcript',
          updatedAt: FieldValue.serverTimestamp()
        });
      }

    } else if (jobStatus === 'rejected') {
      console.log(`[Speechmatics Webhook] Job ${jobId} was rejected`);

      // Mark job as failed
      await jobDoc.ref.update({
        status: 'failed',
        error: job.error || 'Job was rejected by Speechmatics',
        updatedAt: FieldValue.serverTimestamp()
      });

    } else if (jobStatus === 'running') {
      console.log(`[Speechmatics Webhook] Job ${jobId} is now running`);

      // Update status to processing
      await jobDoc.ref.update({
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[Speechmatics Webhook] Error processing callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  return NextResponse.json({
    message: 'Speechmatics webhook endpoint',
    status: 'active',
    tokenProvided: !!token
  });
}