import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateInput, rateLimit } from '@/lib/auth-middleware';
import { transcriptionModesService } from '@/lib/transcription-modes-service';
import { TranscriptionModeSelection } from '@/types/transcription-modes';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting
    const rateLimitResult = rateLimit(`transcription-${userId}`, 10, 60000); // 10 per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const body = await request.json();

    // Input validation
    const validationResult = validateInput(body, {
      fileName: { required: true, type: 'string', minLength: 1, maxLength: 255 },
      fileUrl: { required: true, type: 'string', minLength: 1 },
      fileSize: { required: true, type: 'number' },
      mode: { required: true, type: 'string' },
      priority: { required: true, type: 'string' },
      qualityLevel: { required: true, type: 'string' },
      language: { type: 'string', minLength: 2, maxLength: 10 },
      diarization: { type: 'boolean' }
    });

    if (!validationResult.success) {
      return validationResult.error;
    }

    const {
      fileName,
      fileUrl,
      fileSize,
      duration,
      mode,
      priority,
      qualityLevel,
      specialRequirements,
      language = 'en',
      diarization = false
    } = body;

    // Validate mode
    if (!['ai', 'human', 'hybrid'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid transcription mode' },
        { status: 400 }
      );
    }

    // Validate priority
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    // Validate quality level
    if (!['standard', 'premium', 'enterprise'].includes(qualityLevel)) {
      return NextResponse.json(
        { error: 'Invalid quality level' },
        { status: 400 }
      );
    }

    const modeSelection: TranscriptionModeSelection = {
      mode,
      priority,
      qualityLevel,
      specialRequirements
    };

    const fileData = {
      fileName,
      fileUrl,
      fileSize,
      duration
    };

    // Create transcription job
    const jobId = await transcriptionModesService.createTranscriptionJob(
      userId,
      fileData,
      modeSelection,
      language,
      diarization
    );

    return NextResponse.json({
      success: true,
      jobId,
      mode,
      message: `Transcription job created with ${mode} mode`
    });

  } catch (error) {
    console.error('Transcription mode processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}