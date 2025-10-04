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
    const { credits, reason } = body;

    if (typeof credits !== 'number') {
      return NextResponse.json(
        { error: 'Invalid credits amount' },
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
    const currentCredits = userData?.credits || 0;
    const creditChange = credits - currentCredits;

    // Update user credits
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        credits: credits,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create transaction record
      const transactionRef = adminDb.collection('creditTransactions').doc();
      transaction.set(transactionRef, {
        userId: userId,
        type: creditChange >= 0 ? 'admin_add' : 'admin_deduct',
        amount: Math.abs(creditChange),
        description: reason || `Admin ${creditChange >= 0 ? 'added' : 'deducted'} ${Math.abs(creditChange)} credits`,
        date: FieldValue.serverTimestamp(),
        adminId: adminUserId,
        adminEmail: decodedToken.email,
        status: 'completed',
      });
    });

    console.log(`[Admin] ${decodedToken.email} updated credits for user ${userId}: ${currentCredits} → ${credits} (${creditChange >= 0 ? '+' : ''}${creditChange})`);

    return NextResponse.json({
      success: true,
      newCredits: credits,
      creditChange: creditChange,
      message: `Credits updated successfully`,
    });

  } catch (error) {
    console.error('[Admin API] Error updating user credits:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
