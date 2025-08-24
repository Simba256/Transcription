import { NextRequest, NextResponse } from 'next/server';
import { getAudioDurationFromBuffer, getMimeTypeFromFilename } from '@/lib/audio-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }
    
    console.log(`🎵 Getting duration for file: ${file.name} (${file.size} bytes)`);
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get MIME type from filename
    const mimeType = getMimeTypeFromFilename(file.name);
    console.log(`🎵 Detected MIME type: ${mimeType || 'auto-detect'}`);
    
    // Get actual duration from metadata
    const durationSeconds = await getAudioDurationFromBuffer(buffer, mimeType || file.type);
    const durationMinutes = Math.round(durationSeconds / 60 * 100) / 100;
    
    console.log(`✅ Audio duration detected: ${durationSeconds} seconds (${durationMinutes} minutes)`);
    
    return NextResponse.json({
      success: true,
      duration: {
        seconds: durationSeconds,
        minutes: durationMinutes
      },
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        detectedMimeType: mimeType
      }
    });
    
  } catch (error) {
    console.error('Duration detection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to detect audio duration',
      fallback: 'Will use file size estimation'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Audio duration detection endpoint - use POST with file in FormData'
  });
}