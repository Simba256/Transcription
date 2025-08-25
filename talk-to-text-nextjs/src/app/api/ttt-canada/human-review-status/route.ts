import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { tttCanadaService } from '@/lib/ttt-canada-service';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const humanReviewJobId = searchParams.get('humanReviewJobId');

    if (!humanReviewJobId) {
      return NextResponse.json(
        { error: 'humanReviewJobId parameter is required' },
        { status: 400 }
      );
    }

    // Get human review status
    const status = await tttCanadaService.getHumanReviewStatus(humanReviewJobId);

    return NextResponse.json({
      success: true,
      humanReviewJobId,
      ...status
    });

  } catch (error) {
    console.error('Human review status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint would be used by human reviewers to submit completed work
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const { humanReviewJobId, humanReviewedTranscript, reviewerNotes } = body;

    if (!humanReviewJobId || !humanReviewedTranscript) {
      return NextResponse.json(
        { error: 'humanReviewJobId and humanReviewedTranscript are required' },
        { status: 400 }
      );
    }

    // Complete the human review
    const result = await tttCanadaService.completeHumanReview(
      humanReviewJobId,
      humanReviewedTranscript,
      reviewerNotes
    );

    return NextResponse.json({
      success: true,
      message: 'Human review completed successfully',
      result
    });

  } catch (error) {
    console.error('Human review completion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review completion failed' },
      { status: 500 }
    );
  }
}