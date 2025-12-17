import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to check user's purchased packages and wallet balance
 * GET /api/debug/check-user-packages
 */
export async function GET(request: NextRequest) {
  try {
    // Get user authentication
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user document
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({
        error: 'User document not found'
      }, { status: 404 });
    }

    const userData = userDoc.data();

    // Get recent transactions
    const transactionsSnapshot = await adminDb.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString() || null
    }));

    return NextResponse.json({
      userId,
      email: userData?.email,
      walletBalance: userData?.walletBalance || 0,
      packages: userData?.packages || [],
      freeTrialMinutes: userData?.freeTrialMinutes || 0,
      freeTrialActive: userData?.freeTrialActive || false,
      recentTransactions: transactions,
      debug: {
        hasPackagesField: 'packages' in (userData || {}),
        hasWalletField: 'walletBalance' in (userData || {}),
        packagesIsArray: Array.isArray(userData?.packages),
        packagesCount: Array.isArray(userData?.packages) ? userData.packages.length : 0,
        activePackagesCount: Array.isArray(userData?.packages) ?
          userData.packages.filter((pkg: any) => pkg.active && pkg.minutesRemaining > 0).length : 0
      }
    });

  } catch (error) {
    console.error('[Debug Check Packages] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check user packages'
    }, { status: 500 });
  }
}
