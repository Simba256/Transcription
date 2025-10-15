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
    const { freeTrialMinutes, reason } = body;

    if (typeof freeTrialMinutes !== 'number' || freeTrialMinutes < 0) {
      return NextResponse.json(
        { error: 'Invalid free trial minutes amount' },
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
    const currentFreeTrialMinutes = userData?.freeTrialMinutes || 0;
    const minutesChange = freeTrialMinutes - currentFreeTrialMinutes;

    // Determine if free trial should be active
    const freeTrialActive = freeTrialMinutes > 0;

    // Update user free trial
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        freeTrialMinutes: freeTrialMinutes,
        freeTrialActive: freeTrialActive,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create activity log record
      const activityRef = adminDb.collection('users').doc(userId).collection('activity').doc();
      transaction.set(activityRef, {
        type: 'free_trial_adjustment',
        previousMinutes: currentFreeTrialMinutes,
        newMinutes: freeTrialMinutes,
        minutesChange: minutesChange,
        description: reason || `Admin adjusted free trial minutes to ${freeTrialMinutes}`,
        createdAt: FieldValue.serverTimestamp(),
        adminId: adminUserId,
        adminEmail: decodedToken.email,
      });
    });

    console.log(`[Admin] ${decodedToken.email} updated free trial for user ${userId}: ${currentFreeTrialMinutes} → ${freeTrialMinutes} minutes (${minutesChange >= 0 ? '+' : ''}${minutesChange})`);

    return NextResponse.json({
      success: true,
      newFreeTrialMinutes: freeTrialMinutes,
      minutesChange: minutesChange,
      freeTrialActive: freeTrialActive,
      message: `Free trial updated successfully to ${freeTrialMinutes} minutes`,
    });

  } catch (error) {
    console.error('[Admin API] Error updating user free trial:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update free trial',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
