import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
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

    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing paymentIntentId' },
        { status: 400 }
      );
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Verify the payment belongs to the authenticated user
    if (paymentIntent.metadata.userId !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'Payment does not belong to authenticated user' },
        { status: 403 }
      );
    }

    const credits = parseInt(paymentIntent.metadata.credits);
    const packageId = paymentIntent.metadata.packageId;

    // Update user credits in Firestore
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    
    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const currentCredits = userData?.credits || 0;
      const newCredits = currentCredits + credits;

      // Update user credits
      transaction.update(userRef, {
        credits: newCredits,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create transaction record
      const transactionRef = adminDb.collection('creditTransactions').doc();
      transaction.set(transactionRef, {
        userId: decodedToken.uid,
        type: 'purchase',
        amount: credits,
        description: `Purchased ${packageId} package - ${credits} credits for $${(paymentIntent.amount / 100).toFixed(2)} CAD`,
        date: FieldValue.serverTimestamp(),
        paymentIntentId,
        packageId,
        status: 'completed',
      });
    });

    return NextResponse.json({
      success: true,
      creditsAdded: credits,
      message: `${credits} credits have been added to your account`,
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}