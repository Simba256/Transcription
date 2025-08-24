import { NextResponse } from 'next/server';
import { getMimeTypeFromFilename } from '@/lib/audio-utils';

export async function GET() {
  try {
    console.log('🧪 Testing audio format detection...');
    
    const testFiles = [
      'meeting.wav',
      'interview.mp3', 
      'podcast.m4a',
      'music.aac',
      'recording.ogg',
      'audiobook.flac',
      'stream.webm',
      'voice.opus',
      'song.wma',
      'conference.MP4',  // Test uppercase
      'AUDIO.WAV',       // Test all caps
      'noextension',     // Test no extension
      'file.txt'         // Test non-audio extension
    ];
    
    const results = testFiles.map(filename => {
      const mimeType = getMimeTypeFromFilename(filename);
      return {
        filename,
        mimeType: mimeType || null,
        supported: !!mimeType
      };
    });
    
    const supportedFormats = [
      { format: 'WAV', description: 'Uncompressed/PCM audio', extension: '.wav', mimeType: 'audio/wav' },
      { format: 'MP3', description: 'MPEG-1 Audio Layer 3', extension: '.mp3', mimeType: 'audio/mpeg' },
      { format: 'MP4/M4A', description: 'Advanced Audio Coding', extension: '.mp4/.m4a', mimeType: 'audio/mp4' },
      { format: 'AAC', description: 'Advanced Audio Coding', extension: '.aac', mimeType: 'audio/aac' },
      { format: 'OGG', description: 'Ogg Vorbis', extension: '.ogg', mimeType: 'audio/ogg' },
      { format: 'FLAC', description: 'Free Lossless Audio Codec', extension: '.flac', mimeType: 'audio/flac' },
      { format: 'WEBM', description: 'WebM audio', extension: '.webm', mimeType: 'audio/webm' },
      { format: 'OPUS', description: 'Modern codec', extension: '.opus', mimeType: 'audio/opus' },
      { format: 'WMA', description: 'Windows Media Audio', extension: '.wma', mimeType: 'audio/x-ms-wma' }
    ];
    
    return NextResponse.json({
      success: true,
      message: 'Audio format detection test completed',
      results: {
        testFiles: results,
        supportedFormats,
        strategy: [
          '1. Try MIME type from filename extension',
          '2. Fallback to auto-detection from buffer',
          '3. Handle both compressed and uncompressed formats', 
          '4. Support variable bitrate files',
          '5. Use music-metadata library for robust parsing'
        ],
        stats: {
          totalTested: results.length,
          supported: results.filter(r => r.supported).length,
          unsupported: results.filter(r => !r.supported).length
        }
      }
    });
    
  } catch (error) {
    console.error('Format detection test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'Use GET to run format detection tests'
  });
}