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
    const rateLimitResult = rateLimit(`assignments-${userId}`, 30, 60000); // 30 per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    // Get transcriber assignments
    const assignments = await transcriptionModesService.getTranscriberAssignments(userId);

    return NextResponse.json({
      success: true,
      assignments
    });

  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting
    const rateLimitResult = rateLimit(`submit-${userId}`, 20, 60000); // 20 per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const body = await request.json();
    const { assignmentId, transcription, notes, action } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    if (action === 'submit') {
      if (!transcription || transcription.trim().length === 0) {
        return NextResponse.json(
          { error: 'Transcription text is required' },
          { status: 400 }
        );
      }

      // Submit transcription
      await transcriptionModesService.submitHumanTranscription(
        assignmentId,
        transcription.trim(),
        notes?.trim()
      );

      return NextResponse.json({
        success: true,
        message: 'Transcription submitted successfully'
      });

    } else if (action === 'reject') {
      // Handle job rejection
      // TODO: Implement rejection logic
      return NextResponse.json({
        success: true,
        message: 'Job rejected successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Assignment action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}