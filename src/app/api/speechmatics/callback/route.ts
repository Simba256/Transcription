import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  console.log('[Speechmatics Webhook] ========================================');
  console.log('[Speechmatics Webhook] WEBHOOK RECEIVED at:', new Date().toISOString());

  try {
    const url = new URL(request.url);
    const jobIdParam = url.searchParams.get('jobId');

    console.log('[Speechmatics Webhook] Request details:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      jobIdParam: jobIdParam,
      timestamp: new Date().toISOString()
    });

    // Verify webhook token for security
    const token = url.searchParams.get('token');
    const expectedToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';

    if (token !== expectedToken) {
      console.error('[Speechmatics Webhook] Invalid token. Expected:', expectedToken?.substring(0, 10) + '...', 'Got:', token?.substring(0, 10) + '...');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the webhook payload
    const payload = await request.json();

    // Handle different payload structures based on notification config
    // When contents: ['jobinfo'], the structure is different
    const job = payload.job || payload.jobinfo || payload;
    const speechmaticsJobId = job?.id || payload.id;

    console.log('[Speechmatics Webhook] Payload summary:', {
      hasJob: !!payload.job,
      hasJobinfo: !!payload.jobinfo,
      jobId: speechmaticsJobId,
      jobStatus: job?.status,
      hasResults: !!(payload.results && payload.results.length > 0),
      resultsCount: payload.results?.length || 0,
      payloadKeys: Object.keys(payload)
    });

    if (!speechmaticsJobId) {
      console.error('[Speechmatics Webhook] Missing job ID in payload. Payload keys:', Object.keys(payload));
      console.error('[Speechmatics Webhook] Full payload:', JSON.stringify(payload, null, 2));
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }

    let jobStatus = job.status; // 'running' | 'done' | 'rejected'

    // If status is missing (happens with contents: ['jobinfo']), fetch from API
    if (!jobStatus) {
      console.log(`[Speechmatics Webhook] Status missing in payload, fetching from API for job ${speechmaticsJobId}`);

      const speechmaticsApiKey = process.env.SPEECHMATICS_API_KEY;
      const speechmaticsApiUrl = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';

      if (speechmaticsApiKey) {
        try {
          const statusResponse = await fetch(`${speechmaticsApiUrl}/jobs/${speechmaticsJobId}`, {
            headers: {
              'Authorization': `Bearer ${speechmaticsApiKey}`
            }
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            jobStatus = statusData.job?.status;
            console.log(`[Speechmatics Webhook] Fetched job status from API: ${jobStatus}`);
          } else {
            console.error(`[Speechmatics Webhook] Failed to fetch status: ${statusResponse.status}`);
          }
        } catch (error) {
          console.error(`[Speechmatics Webhook] Error fetching status:`, error);
        }
      }
    }

    // Check if this is a transcript delivery (results present means job is done)
    const hasTranscript = payload.results && Array.isArray(payload.results) && payload.results.length > 0;
    const effectiveStatus = hasTranscript ? 'done' : (jobStatus || 'unknown');

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

        // Debug: Log the overall transcript structure
        console.log(`[Speechmatics Webhook] Transcript metadata:`, JSON.stringify(transcriptData.metadata, null, 2));
        console.log(`[Speechmatics Webhook] First 3 results sample:`, JSON.stringify(transcriptData.results?.slice(0, 3), null, 2));

        // Create timestamped segments from Speechmatics results
        const timestampedSegments = [];
        console.log(`[Speechmatics Webhook] Processing results for timestamped segments. Results count: ${transcriptData.results?.length || 0}`);

        if (transcriptData.results && Array.isArray(transcriptData.results)) {
          let currentSentence = '';
          let sentenceStartTime = null;
          let sentenceEndTime = 0;
          let currentSpeaker = null; // Track current speaker

          for (const result of transcriptData.results) {
            if (result.alternatives && result.alternatives[0] && result.alternatives[0].content) {
              const word = result.alternatives[0].content;
              const startTime = result.start_time || 0;
              const endTime = result.end_time || 0;

              // Check both possible speaker field locations
              const speakerId = result.speaker || result.alternatives[0].speaker || 'UU';

              // Debug log to see the actual structure
              if (result.type === 'word') {
                console.log(`[Speechmatics Webhook] Word: "${word}", Speaker from result: ${result.speaker}, Speaker from alternative: ${result.alternatives[0].speaker}, Final speakerId: ${speakerId}`);
              }

              // Initialize sentence start time and speaker
              if (sentenceStartTime === null && result.type === 'word') {
                sentenceStartTime = startTime;
                currentSpeaker = speakerId;
              }

              // Check if speaker changed - if so, end current sentence and start new one
              const speakerChanged = currentSpeaker && currentSpeaker !== speakerId && result.type === 'word';

              if (speakerChanged && currentSentence.trim()) {
                // Complete the current sentence before speaker change
                timestampedSegments.push({
                  start: sentenceStartTime,
                  end: sentenceEndTime,
                  text: currentSentence.trim(),
                  speaker: currentSpeaker
                });

                // Start new sentence with new speaker
                currentSentence = word;
                sentenceStartTime = startTime;
                currentSpeaker = speakerId;
                sentenceEndTime = endTime;
              } else {
                // Add word or punctuation to current sentence
                if (result.type === 'punctuation' && result.attaches_to === 'previous') {
                  currentSentence += word; // Attach punctuation directly
                } else if (result.type === 'word') {
                  currentSentence += (currentSentence ? ' ' : '') + word;
                  if (!currentSpeaker) currentSpeaker = speakerId; // Set speaker if not set
                }
                sentenceEndTime = endTime;
              }

              // Check if this ends a sentence
              const endsWithPunctuation = result.type === 'punctuation' && result.is_eos;

              if (endsWithPunctuation && currentSentence.trim()) {
                // Complete the sentence segment
                timestampedSegments.push({
                  start: sentenceStartTime,
                  end: sentenceEndTime,
                  text: currentSentence.trim(),
                  speaker: currentSpeaker
                });

                // Reset for next sentence
                currentSentence = '';
                sentenceStartTime = null;
                currentSpeaker = null;
                sentenceEndTime = 0;
              }
            }
          }

          // Handle any remaining incomplete sentence
          if (currentSentence.trim() && sentenceStartTime !== null) {
            timestampedSegments.push({
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: currentSentence.trim(),
              speaker: currentSpeaker
            });
          }
        }

        console.log(`[Speechmatics Webhook] Created ${timestampedSegments.length} timestamped segments for job ${jobId}`);

        // Extract plain text transcript from segments
        const plainTextTranscript = timestampedSegments.map(seg => seg.text).join(' ');

        // Calculate the approximate size of the data
        const dataSize = JSON.stringify({ transcript: transcriptData, timestampedTranscript: timestampedSegments }).length;
        const maxFirestoreSize = 900000; // 900KB to leave buffer under 1MB limit

        console.log(`[Speechmatics Webhook] Transcript data size: ${dataSize} bytes`);

        // If data is too large, store in Firebase Storage instead
        if (dataSize > maxFirestoreSize) {
          console.log(`[Speechmatics Webhook] Data too large for Firestore, storing in Storage`);

          const { getStorage } = await import('firebase-admin/storage');
          const bucket = getStorage().bucket();

          // Store transcript data in Storage
          const transcriptPath = `transcripts/${jobId}/transcript.json`;
          const transcriptFile = bucket.file(transcriptPath);

          await transcriptFile.save(JSON.stringify({
            transcript: plainTextTranscript,
            timestampedTranscript: timestampedSegments
          }), {
            contentType: 'application/json',
            metadata: {
              jobId: jobId,
              createdAt: new Date().toISOString()
            }
          });

          console.log(`[Speechmatics Webhook] Stored large transcript in Storage: ${transcriptPath}`);

          // Determine final status based on transcription mode
          // For hybrid mode, send to pending-review; for AI mode, mark as complete
          const finalStatus = jobData.mode === 'hybrid' ? 'pending-review' : 'complete';
          console.log(`[Speechmatics Webhook] Job mode: ${jobData.mode}, setting status to: ${finalStatus}`);

          // Update Firestore with reference to Storage location
          await jobDoc.ref.update({
            status: finalStatus,
            transcriptStoragePath: transcriptPath,
            segmentCount: timestampedSegments.length,
            transcriptLength: plainTextTranscript.length,
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          // Data fits in Firestore, store directly
          console.log(`[Speechmatics Webhook] Data fits in Firestore, storing directly`);

          // Determine final status based on transcription mode
          // For hybrid mode, send to pending-review; for AI mode, mark as complete
          const finalStatus = jobData.mode === 'hybrid' ? 'pending-review' : 'complete';
          console.log(`[Speechmatics Webhook] Job mode: ${jobData.mode}, setting status to: ${finalStatus}`);

          await jobDoc.ref.update({
            status: finalStatus,
            transcript: plainTextTranscript,
            timestampedTranscript: timestampedSegments,
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        console.log(`[Speechmatics Webhook] Job ${jobId} marked as ${jobData.mode === 'hybrid' ? 'pending-review' : 'complete'}`);

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