import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to test the complete transcription flow
 * GET /api/debug/test-transcription-flow
 */
export async function GET(request: NextRequest) {
  try {
    // Get user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const results: any = {
      userId,
      email: decodedToken.email,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check 1: User document exists and has packages
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        results.checks.userDocument = { status: 'FAIL', error: 'User document not found' };
      } else {
        const userData = userDoc.data();
        results.checks.userDocument = {
          status: 'PASS',
          walletBalance: userData?.walletBalance || 0,
          packagesCount: Array.isArray(userData?.packages) ? userData.packages.length : 0,
          activePackages: Array.isArray(userData?.packages)
            ? userData.packages.filter((pkg: any) => pkg.active && pkg.minutesRemaining > 0).length
            : 0
        };
      }
    } catch (error) {
      results.checks.userDocument = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check 2: Can create a test transcription job
    try {
      const testJobId = `test-${Date.now()}`;
      const testJob = {
        userId,
        filename: 'test-diagnostic.mp3',
        originalFilename: 'test-diagnostic.mp3',
        downloadURL: 'https://example.com/test.mp3',
        status: 'pending',
        mode: 'ai',
        duration: 60,
        createdAt: new Date().toISOString(),
      };

      await adminDb.collection('transcriptions').doc(testJobId).set(testJob);

      // Verify it was created
      const jobDoc = await adminDb.collection('transcriptions').doc(testJobId).get();

      if (jobDoc.exists) {
        results.checks.createJob = { status: 'PASS', jobId: testJobId };

        // Clean up test job
        await adminDb.collection('transcriptions').doc(testJobId).delete();
      } else {
        results.checks.createJob = { status: 'FAIL', error: 'Job not created' };
      }
    } catch (error) {
      results.checks.createJob = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check 3: Test process API endpoint
    try {
      const testResponse = await fetch(new URL('/api/transcriptions/process', request.url).toString(), {
        method: 'OPTIONS',
      });

      results.checks.processAPI = {
        status: testResponse.ok ? 'PASS' : 'FAIL',
        statusCode: testResponse.status,
        headers: {
          'access-control-allow-origin': testResponse.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': testResponse.headers.get('access-control-allow-methods'),
        }
      };
    } catch (error) {
      results.checks.processAPI = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check 4: Firebase Storage access
    try {
      // We can't test actual upload without a file, but we can check if the bucket is configured
      results.checks.firebaseStorage = {
        status: 'INFO',
        message: 'Storage bucket configured',
        bucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'not configured'
      };
    } catch (error) {
      results.checks.firebaseStorage = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check 5: Speechmatics configuration
    try {
      const hasApiKey = !!process.env.SPEECHMATICS_API_KEY;
      const hasApiUrl = !!process.env.SPEECHMATICS_API_URL;

      results.checks.speechmatics = {
        status: (hasApiKey && hasApiUrl) ? 'PASS' : 'WARN',
        apiKeyConfigured: hasApiKey,
        apiUrlConfigured: hasApiUrl,
        message: hasApiKey && hasApiUrl
          ? 'Speechmatics configured'
          : 'Speechmatics not configured (optional)'
      };
    } catch (error) {
      results.checks.speechmatics = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Overall status
    const allChecks = Object.values(results.checks);
    const hasFailures = allChecks.some((check: any) => check.status === 'FAIL' || check.status === 'ERROR');

    results.overallStatus = hasFailures ? 'ISSUES_FOUND' : 'ALL_SYSTEMS_GO';
    results.summary = {
      total: allChecks.length,
      passed: allChecks.filter((check: any) => check.status === 'PASS').length,
      failed: allChecks.filter((check: any) => check.status === 'FAIL').length,
      errors: allChecks.filter((check: any) => check.status === 'ERROR').length,
      warnings: allChecks.filter((check: any) => check.status === 'WARN').length,
    };

    return NextResponse.json(results, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Debug Transcription Flow] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to run diagnostic',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
