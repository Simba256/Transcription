import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Direct database update test - bypasses Stripe webhook to test if database updates work
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount = 10, type = 'wallet' } = body;

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400 });
    }

    console.log(`[Test Direct] Testing database update for user ${userId}`);

    const userRef = adminDb.collection('users').doc(userId);

    try {
      await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User not found in database');
        }

        const userData = userDoc.data();
        const currentWallet = userData?.walletBalance || 0;
        const newBalance = currentWallet + amount;

        // Update user wallet
        transaction.update(userRef, {
          walletBalance: newBalance,
          credits: 0,
          updatedAt: FieldValue.serverTimestamp(),
          lastTestUpdate: new Date().toISOString()
        });

        // Create transaction record
        const transactionRef = adminDb.collection('transactions').doc();
        transaction.set(transactionRef, {
          userId,
          type: 'wallet_topup',
          amount: amount,
          description: `Test wallet top-up: CA$${amount.toFixed(2)}`,
          createdAt: FieldValue.serverTimestamp(),
          testMode: true,
          source: 'direct-test'
        });

        console.log(`[Test Direct] Updated wallet from ${currentWallet} to ${newBalance}`);
      });

      return NextResponse.json({
        success: true,
        message: `Successfully updated wallet balance by CA$${amount}`,
        details: {
          userId,
          amountAdded: amount,
          type
        },
        nextSteps: [
          '1. Refresh your website billing page',
          '2. Check if balance updated',
          '3. If this works but webhook fails, the issue is Stripe signature verification',
          '4. If this also fails, check Firebase permissions'
        ]
      });

    } catch (error) {
      console.error('[Test Direct] Database error:', error);

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Database update failed',
        troubleshooting: [
          'User might not exist in database',
          'Firebase Admin SDK might not be configured',
          'Check Firebase service account permissions'
        ]
      });
    }

  } catch (error) {
    console.error('[Test Direct] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    title: 'Direct Database Test',
    description: 'Tests database updates directly, bypassing Stripe webhook',
    usage: {
      method: 'POST',
      body: {
        userId: 'YOUR_USER_ID',
        amount: 10
      }
    },
    purpose: 'This helps identify if the issue is with Stripe webhook or database'
  });
}