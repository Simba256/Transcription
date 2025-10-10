import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, sessionId, notes } = body;

    if (!email || !amount) {
      return NextResponse.json({
        error: 'email and amount are required'
      }, { status: 400 });
    }

    console.log(`[Manual Credit] Looking for user with email: ${email}`);

    // Find user by email
    const usersRef = adminDb.collection('users');
    const userQuery = await usersRef.where('email', '==', email).limit(1).get();

    if (userQuery.empty) {
      return NextResponse.json({
        error: `No user found with email: ${email}`,
        suggestion: 'Check the exact email address in Firebase'
      }, { status: 404 });
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`[Manual Credit] Found user: ${userId}`);

    // Update wallet balance
    const currentWallet = userData.walletBalance || 0;
    const newBalance = currentWallet + amount;

    await userDoc.ref.update({
      walletBalance: newBalance,
      lastManualCredit: {
        amount,
        sessionId: sessionId || 'manual',
        creditedAt: FieldValue.serverTimestamp(),
        notes: notes || 'Manual credit for payment without userId metadata'
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    // Create transaction record
    const transactionRef = adminDb.collection('transactions').doc();
    await transactionRef.set({
      userId,
      type: 'wallet_topup',
      amount: amount,
      description: `Manual credit: CA$${amount.toFixed(2)}`,
      sessionId: sessionId || null,
      manualCredit: true,
      creditedBy: 'admin',
      reason: notes || 'Payment processed without userId metadata',
      createdAt: FieldValue.serverTimestamp()
    });

    console.log(`[Manual Credit] Successfully credited CA$${amount} to user ${email}`);

    return NextResponse.json({
      success: true,
      message: `Successfully credited CA$${amount} to ${email}`,
      details: {
        userId,
        email,
        previousBalance: currentWallet,
        newBalance,
        amountCredited: amount
      }
    });

  } catch (error) {
    console.error('[Manual Credit] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to credit account'
    }, { status: 500 });
  }
}

// GET endpoint to provide instructions
export async function GET() {
  return NextResponse.json({
    title: 'Manual Credit Tool',
    description: 'Manually credit accounts for payments that failed to process',
    usage: {
      method: 'POST',
      body: {
        email: 'customer@example.com',
        amount: 50.00,
        sessionId: 'cs_live_xxxxx (optional)',
        notes: 'Reason for manual credit (optional)'
      }
    },
    example: {
      email: 'jenn_o@live.ca',
      amount: 50.00,
      sessionId: 'cs_live_a13s2ch7gQknIXcyVUq7zJAczmxdBxRkZli6S2JEYV1mfJLnyB6ArdB9JI',
      notes: 'Payment via Stripe Payment Link without userId metadata'
    }
  });
}