import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * TEST MODE ONLY - Simulates payment processing for development
 * This endpoint is DISABLED in production for security
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Completely disable in production environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is disabled in production' },
        { status: 403 }
      );
    }

    // Additional check: Only allow in test mode with test Stripe keys
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    if (!stripeKey.includes('pk_test')) {
      return NextResponse.json(
        { error: 'Test payments only available with test Stripe keys' },
        { status: 403 }
      );
    }

    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const body = await request.json();
    const { type, amount, packageData } = body;

    const userRef = adminDb.collection('users').doc(userId);

    if (type === 'wallet') {
      // Simulate wallet top-up
      await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentWallet = userData?.walletBalance || 0;

        transaction.update(userRef, {
          walletBalance: currentWallet + amount,
          credits: 0, // Clear legacy credits
          updatedAt: FieldValue.serverTimestamp(),
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
        });
      });

      console.log(`[TEST] Wallet updated for user ${userId}: +CA$${amount.toFixed(2)}`);

      return NextResponse.json({
        success: true,
        message: `Test wallet top-up successful: CA$${amount.toFixed(2)} added`,
      });

    } else if (type === 'package') {
      // Simulate package purchase
      await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();

        // Create package
        const packageId = `pkg_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const newPackage = {
          id: packageId,
          type: packageData.type,
          name: packageData.name,
          minutesTotal: packageData.minutes,
          minutesUsed: 0,
          minutesRemaining: packageData.minutes,
          rate: packageData.rate,
          purchasedAt: now, // Use Date object instead of FieldValue
          expiresAt: expiresAt, // Use Date object instead of FieldValue
          active: true,
          testMode: true,
        };

        // Update user with new package
        const currentPackages = userData?.packages || [];
        transaction.update(userRef, {
          packages: [...currentPackages, newPackage],
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Create transaction record
        const transactionRef = adminDb.collection('transactions').doc();
        transaction.set(transactionRef, {
          userId,
          type: 'package_purchase',
          amount: packageData.price,
          description: `Test package: ${packageData.name} (${packageData.minutes} minutes)`,
          packageId,
          createdAt: FieldValue.serverTimestamp(),
          testMode: true,
        });
      });

      console.log(`[TEST] Package added for user ${userId}: ${packageData.name}`);

      return NextResponse.json({
        success: true,
        message: `Test package purchase successful: ${packageData.name}`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid payment type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Test payment error:', error);
    return NextResponse.json(
      { error: 'Test payment failed' },
      { status: 500 }
    );
  }
}