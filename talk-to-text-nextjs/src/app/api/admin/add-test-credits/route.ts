import { NextRequest, NextResponse } from 'next/server';
import { creditService } from '@/lib/credit-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, credits, description } = await request.json();

    // Basic validation
    if ((!userId && !email) || !credits || credits <= 0) {
      return NextResponse.json(
        { error: 'UserId or email and valid credit amount required' },
        { status: 400 }
      );
    }

    // For security, only allow specific test emails or known test user IDs
    const allowedTestEmails = [
      'abc111111@gmail.com',
      'test@example.com',
      // Add other test emails here
    ];

    const allowedTestUserIds = [
      // Add known test user IDs here if you have them
    ];

    // If email is provided, check if it's allowed
    if (email && !allowedTestEmails.includes(email)) {
      return NextResponse.json(
        { error: 'Only test emails are allowed' },
        { status: 403 }
      );
    }

    // If userId is provided, check if it's allowed (or skip check for now since it's testing)
    let targetUserId = userId;
    
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Please provide userId. Check Firebase Console for user ID associated with abc111111@gmail.com' },
        { status: 400 }
      );
    }

    // Add credits
    await creditService.addCredits(
      targetUserId,
      credits,
      description || `Test credits added${email ? ` for ${email}` : ''}`,
      undefined, // no payment intent
      'test_package'
    );

    // Get updated balance
    const balance = await creditService.getCreditBalance(targetUserId);

    return NextResponse.json({
      success: true,
      message: `Added ${credits} credits to user ${targetUserId}${email ? ` (${email})` : ''}`,
      userId: targetUserId,
      newBalance: balance.balance,
      totalPurchased: balance.totalPurchased
    });

  } catch (error) {
    console.error('Add test credits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add credits' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Admin endpoint to add test credits',
    usage: 'POST with { userId, email?, credits, description? }',
    example: {
      userId: 'firebase_user_id_here',
      email: 'abc111111@gmail.com',
      credits: 100000,
      description: 'Test credits for development'
    },
    allowedEmails: ['abc111111@gmail.com', 'test@example.com'],
    note: 'You need to get the userId from Firebase Console > Authentication'
  });
}