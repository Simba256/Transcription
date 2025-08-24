import { NextRequest, NextResponse } from 'next/server';
import { transcriptionModesService } from '@/lib/transcription-modes-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing complete AI transcription workflow...');
    
    // Get the file URL from the request
    const body = await request.json();
    const { fileUrl, userId = 'test-user', fileName = 'test-audio.wav' } = body;
    
    if (!fileUrl) {
      return NextResponse.json({
        success: false,
        message: 'File URL is required for testing'
      }, { status: 400 });
    }
    
    // Create a test transcription job
    const jobId = await transcriptionModesService.createTranscriptionJob(
      userId,
      {
        fileName,
        fileUrl,
        fileSize: 1024 * 1024, // 1MB placeholder
        duration: 5 // 5 minutes placeholder
      },
      {
        mode: 'ai',
        priority: 'normal'
      },
      'en',
      false
    );
    
    console.log(`✅ Created test transcription job: ${jobId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Test transcription job created successfully',
      jobId,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Test transcription error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test transcription endpoint - use POST with { fileUrl, userId?, fileName? }'
  });
}