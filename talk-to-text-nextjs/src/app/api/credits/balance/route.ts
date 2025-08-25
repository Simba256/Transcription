import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { creditService } from '@/lib/credit-service';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Get credit balance
    const balance = await creditService.getCreditBalance(userId);

    return NextResponse.json({
      success: true,
      balance
    });

  } catch (error) {
    console.error('Get credit balance error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get balance' },
      { status: 500 }
    );
  }
}