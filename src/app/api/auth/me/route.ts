import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Try to get auth from cookie first (server-side auth)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      // Try to get from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: 'Not authenticated',
          message: 'Please sign in first',
          instructions: [
            '1. Sign in to the website',
            '2. Visit this URL again',
            '3. Your user ID will be displayed'
          ]
        }, { status: 401 });
      }

      const headerToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(headerToken);
        return NextResponse.json({
          success: true,
          userId: decodedToken.uid,
          email: decodedToken.email,
          message: 'Use this userId for testing',
          testCommand: `curl -X POST https://${request.headers.get('host')}/api/debug/simulate-payment \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "${decodedToken.uid}",
    "amount": 10,
    "type": "wallet"
  }'`
        });
      } catch (error) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'Your authentication token is invalid or expired'
        }, { status: 401 });
      }
    }

    // Verify the cookie token
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);

      return NextResponse.json({
        success: true,
        userId: decodedToken.uid,
        email: decodedToken.email,
        message: '✅ Here is your user ID for testing!',
        copyThisUserId: decodedToken.uid,
        testCommand: `curl -X POST https://${request.headers.get('host')}/api/debug/simulate-payment \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "${decodedToken.uid}",
    "amount": 10,
    "type": "wallet"
  }'`
      });

    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({
        error: 'Session expired',
        message: 'Please sign in again',
        instructions: [
          '1. Sign out and sign back in',
          '2. Visit this URL again',
          '3. Your user ID will be displayed'
        ]
      }, { status: 401 });
    }

  } catch (error) {
    console.error('[Auth Me] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get user info'
    }, { status: 500 });
  }
}