import { NextRequest, NextResponse } from 'next/server';
import { updateTranscriptionStatusAdmin } from '@/lib/firebase/transcriptions-admin';

export async function POST(request: NextRequest) {
  try {
    const { speechmaticsJobId, transcriptionJobId } = await request.json();

    if (!speechmaticsJobId || !transcriptionJobId) {
      return NextResponse.json({
        error: 'Both speechmaticsJobId and transcriptionJobId are required'
      }, { status: 400 });
    }

    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Speechmatics API key not configured' }, { status: 500 });
    }

    console.log(`[Manual Retrieve] Getting transcript for Speechmatics job: ${speechmaticsJobId}`);

    // Get the transcript from Speechmatics
    const transcriptResponse = await fetch(`https://asr.api.speechmatics.com/v2/jobs/${speechmaticsJobId}/transcript`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Failed to fetch transcript: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log(`[Manual Retrieve] Retrieved transcript data with ${transcriptData.results?.length || 0} results`);

    // Process the transcript data similar to webhook processing
    const timestampedSegments = [];

    if (transcriptData.results && Array.isArray(transcriptData.results)) {
      let currentSentence = '';
      let sentenceStartTime = null;
      let sentenceEndTime = 0;
      let currentSpeaker = null;

      for (const result of transcriptData.results) {
        if (result.alternatives && result.alternatives[0] && result.alternatives[0].content) {
          const word = result.alternatives[0].content;
          const startTime = result.start_time || 0;
          const endTime = result.end_time || 0;
          const speakerId = result.speaker || result.alternatives[0].speaker || 'UU';

          console.log(`[Manual Retrieve] Processing word: "${word}", speaker: ${speakerId}`);

          if (sentenceStartTime === null && result.type === 'word') {
            sentenceStartTime = startTime;
            currentSpeaker = speakerId;
          }

          const speakerChanged = currentSpeaker && currentSpeaker !== speakerId && result.type === 'word';

          if (speakerChanged && currentSentence.trim()) {
            timestampedSegments.push({
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: currentSentence.trim(),
              speaker: currentSpeaker
            });

            currentSentence = word;
            sentenceStartTime = startTime;
            currentSpeaker = speakerId;
            sentenceEndTime = endTime;
          } else {
            if (result.type === 'punctuation' && result.attaches_to === 'previous') {
              currentSentence += word;
            } else if (result.type === 'word') {
              currentSentence += (currentSentence ? ' ' : '') + word;
              if (!currentSpeaker) currentSpeaker = speakerId;
            }
            sentenceEndTime = endTime;
          }

          const endsWithPunctuation = result.type === 'punctuation' && result.is_eos;

          if (endsWithPunctuation && currentSentence.trim()) {
            timestampedSegments.push({
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: currentSentence.trim(),
              speaker: currentSpeaker
            });

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

    console.log(`[Manual Retrieve] Created ${timestampedSegments.length} timestamped segments`);

    // Update the transcription job
    await updateTranscriptionStatusAdmin(transcriptionJobId, 'complete', {
      transcript: transcriptData,
      timestampedTranscript: timestampedSegments
    });

    console.log(`[Manual Retrieve] Updated transcription job ${transcriptionJobId} to complete`);

    return NextResponse.json({
      success: true,
      message: 'Transcript retrieved and job completed successfully',
      segmentsCount: timestampedSegments.length,
      speakersDetected: [...new Set(timestampedSegments.map(s => s.speaker).filter(s => s))].length
    });

  } catch (error) {
    console.error('[Manual Retrieve] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}