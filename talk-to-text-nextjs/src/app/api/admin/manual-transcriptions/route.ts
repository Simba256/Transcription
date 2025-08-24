import { NextRequest, NextResponse } from 'next/server';
import { transcriptionModesService } from '@/lib/transcription-modes-service';
import { RoleManagementService } from '@/lib/role-management';

// GET /api/admin/manual-transcriptions - Get jobs queued for admin
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated (in production you'd validate the auth token)
    const authHeader = request.headers.get('authorization');
    
    // For development, we'll skip strict auth validation
    // In production, implement proper JWT validation here
    
    // Simplified approach: Just get jobs queued for admin manual transcription
    // This avoids complex composite indexes on mode+createdAt
    const adminQueue = await transcriptionModesService.getAdminQueue();

    // Sort by creation date (newest first) - this sorting is done in memory to avoid index issues
    adminQueue.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.parse(a.createdAt as any);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.parse(b.createdAt as any);
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      jobs: adminQueue,
      count: adminQueue.length,
      stats: {
        queued: adminQueue.filter(job => job.status === 'queued_for_admin').length,
        inReview: adminQueue.filter(job => job.status === 'admin_review').length,
        total: adminQueue.length
      }
    });

  } catch (error) {
    console.error('Error fetching admin manual transcriptions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch admin transcription queue',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}