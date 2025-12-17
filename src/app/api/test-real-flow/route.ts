import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Test endpoint that simulates the EXACT real upload flow
 * Creates a real job, then tries to process it
 */
export async function POST(request: NextRequest) {
  const testId = `test-${Date.now()}`;

  try {
    console.log(`[Test Real Flow] Starting test ${testId}`);

    // Step 1: Get authenticated user
    const authHeader = request.headers.get('authorization');
    const token = request.cookies.get('auth-token')?.value;

    let userId: string;
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } else if (token) {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`[Test Real Flow] Authenticated as user: ${userId}`);

    // Step 2: Create a test job in Firestore (simulating upload flow)
    const jobId = `test-real-job-${testId}`;
    const jobData = {
      userId,
      filename: 'test-audio.mp3',
      originalFilename: 'test-audio.mp3',
      downloadURL: 'https://example.com/test-audio.mp3', // Fake URL
      status: 'processing',
      mode: 'ai',
      duration: 180, // 3 minutes
      creditsUsed: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`[Test Real Flow] Creating job in Firestore: ${jobId}`);
    await adminDb.collection('transcriptions').doc(jobId).set(jobData);
    console.log(`[Test Real Flow] Job created successfully`);

    // Step 3: Wait a bit (simulate real timing)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 4: Try to call the process API (same as real upload does)
    console.log(`[Test Real Flow] Calling process API for job: ${jobId}`);

    const processResponse = await fetch(new URL('/api/transcriptions/process', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        jobId,
        language: 'en',
        operatingPoint: 'standard',
      }),
    });

    const responseText = await processResponse.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    console.log(`[Test Real Flow] Process API response:`, {
      status: processResponse.status,
      statusText: processResponse.statusText,
      body: responseBody,
    });

    // Step 5: Clean up - delete test job
    console.log(`[Test Real Flow] Cleaning up test job`);
    await adminDb.collection('transcriptions').doc(jobId).delete();

    // Step 6: Return results
    return NextResponse.json({
      success: processResponse.status !== 405,
      testId,
      results: {
        jobCreated: true,
        jobId,
        processApiStatus: processResponse.status,
        processApiResponse: responseBody,
        conclusion: processResponse.status === 405
          ? '🔴 REPRODUCED THE 405 ERROR! Issue confirmed in real flow.'
          : processResponse.status === 404
          ? '✅ Got expected 404 (job not found by process API - possible timing issue)'
          : processResponse.status === 400
          ? '⚠️ Got 400 error (validation or status issue)'
          : '✅ Process API worked correctly',
      },
    });

  } catch (error: any) {
    console.error(`[Test Real Flow] Error:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}
