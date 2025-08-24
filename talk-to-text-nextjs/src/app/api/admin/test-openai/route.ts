import { NextRequest, NextResponse } from 'next/server';
import { openaiService } from '@/lib/openai-service';

export async function POST(request: NextRequest) {
  try {
    // Test OpenAI connection
    console.log('🧪 Testing OpenAI integration...');
    
    const isConnected = await openaiService.testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'OpenAI connection successful',
        status: 'ready_for_transcription'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'OpenAI connection failed',
        status: 'configuration_error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('OpenAI test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OpenAI test endpoint - use POST to test connection'
  });
}