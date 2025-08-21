import { NextRequest, NextResponse } from 'next/server';
import { speechmaticsService } from '@/lib/speechmatics';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const fileName = formData.get('fileName') as string;
    const firestoreDocId = formData.get('firestoreDocId') as string;
    const language = formData.get('language') as string || 'en';
    const diarization = formData.get('diarization') === 'true';

    if (!audioFile || !fileName || !firestoreDocId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const config = {
      type: 'transcription',
      transcription_config: {
        language,
        ...(diarization && { diarization: 'speaker' as const })
      }
    };

    const result = await speechmaticsService.submitTranscriptionJob(
      buffer,
      fileName,
      config
    );

    return NextResponse.json({ jobId: result.job_id });
  } catch (error) {
    console.error('Transcription submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription submission failed' },
      { status: 500 }
    );
  }
}