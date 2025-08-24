import { NextRequest, NextResponse } from 'next/server';
import { transcriptionModesService } from '@/lib/transcription-modes-service';

// POST /api/admin/mark-in-progress - Mark job as in progress when admin starts working
export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    await transcriptionModesService.markJobInProgress(jobId);

    return NextResponse.json({
      success: true,
      message: 'Job marked as in progress'
    });

  } catch (error) {
    console.error('Error marking job as in progress:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to mark job as in progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}