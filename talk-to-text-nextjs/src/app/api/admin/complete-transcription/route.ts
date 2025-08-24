import { NextRequest, NextResponse } from 'next/server';
import { transcriptionModesService } from '@/lib/transcription-modes-service';
import { RoleManagementService } from '@/lib/role-management';

// POST /api/admin/complete-transcription - Complete a manual transcription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, transcription, adminNotes, reviewedBy } = body;

    // Validate required fields
    if (!jobId || !transcription?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: jobId and transcription are required' 
        },
        { status: 400 }
      );
    }

    // Check if user is authenticated and has admin role
    // In production, implement proper JWT validation here
    const authHeader = request.headers.get('authorization');
    
    // For development, we'll skip strict auth validation
    // In production, validate the user's admin role here
    
    // Submit the admin transcription
    await transcriptionModesService.submitAdminTranscription(
      jobId,
      transcription.trim(),
      adminNotes?.trim(),
      reviewedBy || 'Admin'
    );

    console.log(`✅ Admin completed transcription for job ${jobId} by ${reviewedBy || 'Admin'}`);

    return NextResponse.json({
      success: true,
      message: 'Transcription completed successfully',
      jobId,
      completedBy: reviewedBy || 'Admin',
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error completing admin transcription:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Job not found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Job not found',
            message: 'The specified transcription job could not be found'
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to complete transcription',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/complete-transcription/[jobId] - Get specific job details for completion
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.pathname.split('/').pop();

    if (!jobId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Job ID is required' 
        },
        { status: 400 }
      );
    }

    // Get job details (this would need to be implemented in the service)
    // For now, we'll return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Job details endpoint - implementation needed',
      jobId
    });

  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch job details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}