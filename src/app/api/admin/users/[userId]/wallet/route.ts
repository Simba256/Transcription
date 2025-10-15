import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminUserId = decodedToken.uid;

    // Verify admin role
    const adminDoc = await adminDb.collection('users').doc(adminUserId).get();
    const adminData = adminDoc.data();

    if (adminData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { walletBalance, reason } = body;

    if (typeof walletBalance !== 'number' || walletBalance < 0) {
      return NextResponse.json(
        { error: 'Invalid wallet balance amount' },
        { status: 400 }
      );
    }

    // Get the user document
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentWalletBalance = userData?.walletBalance || 0;
    const balanceChange = walletBalance - currentWalletBalance;

    // Update user wallet balance
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        walletBalance: walletBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create transaction record
      const transactionRef = adminDb.collection('transactions').doc();
      transaction.set(transactionRef, {
        userId: userId,
        type: balanceChange >= 0 ? 'adjustment' : 'adjustment',
        amount: balanceChange,
        description: reason || `Admin adjusted wallet balance to CA$${walletBalance.toFixed(2)}`,
        createdAt: FieldValue.serverTimestamp(),
        adminId: adminUserId,
        adminEmail: decodedToken.email,
        source: 'admin_adjustment',
      });
    });

    console.log(`[Admin] ${decodedToken.email} updated wallet balance for user ${userId}: CA$${currentWalletBalance.toFixed(2)} → CA$${walletBalance.toFixed(2)} (${balanceChange >= 0 ? '+' : ''}CA$${balanceChange.toFixed(2)})`);

    return NextResponse.json({
      success: true,
      newWalletBalance: walletBalance,
      balanceChange: balanceChange,
      message: `Wallet balance updated successfully to CA$${walletBalance.toFixed(2)}`,
    });

  } catch (error) {
    console.error('[Admin API] Error updating user wallet balance:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update wallet balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}