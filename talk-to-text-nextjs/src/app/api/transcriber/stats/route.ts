import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, rateLimit } from '@/lib/auth-middleware';
import { transcriptionModesService } from '@/lib/transcription-modes-service';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting
    const rateLimitResult = rateLimit(`stats-${userId}`, 10, 60000); // 10 per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    // Get transcriber stats
    const stats = await transcriptionModesService.getTranscriberStats(userId);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stats' },
      { status: 500 }
    );
  }
}