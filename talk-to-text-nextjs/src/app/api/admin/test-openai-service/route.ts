import { NextResponse } from 'next/server';
import { openaiService } from '@/lib/openai-service';
import fs from 'fs';

export async function POST() {
  try {
    console.log('🧪 Testing OpenAI service integration...');
    
    // Read the harvard.wav file directly
    const audioPath = '/media/basim/New Volume/Basim/Saad Bhai/Chamelion Ideas/Transcription/Audio/harvard.wav';
    
    if (!fs.existsSync(audioPath)) {
      return NextResponse.json({
        success: false,
        message: 'Test audio file not found'
      }, { status: 404 });
    }
    
    const audioBuffer = fs.readFileSync(audioPath);
    console.log(`📁 Loaded audio file: ${audioBuffer.length} bytes`);
    
    // Test the complete transcription workflow with pure Whisper output
    const startTime = Date.now();
    const result = await openaiService.completeTranscription(audioBuffer, {
      language: 'en',
      enhancementType: 'none'  // Pure Whisper output, no word changes
    });
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI service test completed successfully',
      result: {
        originalTranscript: result.originalTranscript,
        enhancedTranscript: result.enhancedTranscript,
        wordCount: result.wordCount,
        confidence: result.confidence,
        processingTime: result.processingTime,
        testDuration: duration
      }
    });
    
  } catch (error) {
    console.error('OpenAI service test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OpenAI service test endpoint - use POST to test'
  });
}