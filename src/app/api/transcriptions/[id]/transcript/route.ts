import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const userId = decodedToken.uid;

    // Get the transcription document
    const transcriptionDoc = await adminDb.collection('transcriptions').doc(id).get();

    if (!transcriptionDoc.exists) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const transcriptionData = transcriptionDoc.data();

    // Check if user owns this transcription
    if (transcriptionData?.userId !== userId) {
      // Check if user is admin
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { error: 'You do not have permission to update this transcription' },
          { status: 403 }
        );
      }
    }

    // Get the updated transcript data from request body
    const body = await request.json();
    const { timestampedTranscript, transcript } = body;

    console.log('[API PUT] Received update request:', {
      transcriptionId: id,
      hasTimestampedTranscript: !!timestampedTranscript,
      segmentsCount: timestampedTranscript?.length,
      transcriptLength: transcript?.length,
      firstSegmentSample: timestampedTranscript?.[0]?.text?.substring(0, 50)
    });

    // Check if transcript is in Storage
    const transcriptStoragePath = transcriptionData?.transcriptStoragePath;

    if (!transcriptStoragePath) {
      console.error('[API PUT] No transcriptStoragePath found in transcription document');
      return NextResponse.json(
        { error: 'Transcript not stored in Storage' },
        { status: 404 }
      );
    }

    console.log('[API PUT] Updating Storage file:', transcriptStoragePath);

    // Update transcript in Storage
    const bucket = getStorage().bucket();
    const file = bucket.file(transcriptStoragePath);

    const updatedTranscriptData = {
      transcript,
      timestampedTranscript
    };

    console.log('[API PUT] Writing data to Storage:', {
      dataSize: JSON.stringify(updatedTranscriptData).length,
      segmentsCount: timestampedTranscript?.length
    });

    await file.save(JSON.stringify(updatedTranscriptData), {
      contentType: 'application/json',
      metadata: {
        updated: new Date().toISOString()
      }
    });

    console.log(`[API PUT] Successfully updated transcript in Storage: ${transcriptStoragePath}`);

    return NextResponse.json({
      success: true,
      message: 'Transcript updated successfully'
    });

  } catch (error) {
    console.error('[API] Error updating transcript in Storage:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update transcript',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the transcription document
    const transcriptionDoc = await adminDb.collection('transcriptions').doc(id).get();

    if (!transcriptionDoc.exists) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const transcriptionData = transcriptionDoc.data();

    // Check if user owns this transcription
    if (transcriptionData?.userId !== userId) {
      // Check if user is admin
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { error: 'You do not have permission to view this transcription' },
          { status: 403 }
        );
      }
    }

    // Check if transcript is in Storage or Firestore
    const transcriptStoragePath = transcriptionData?.transcriptStoragePath;

    if (transcriptStoragePath) {
      // Fetch transcript from Storage
      const bucket = getStorage().bucket();
      const file = bucket.file(transcriptStoragePath);

      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json(
          { error: 'Transcript file not found in Storage' },
          { status: 404 }
        );
      }

      const [fileContents] = await file.download();
      const transcriptData = JSON.parse(fileContents.toString('utf-8'));

      return NextResponse.json(transcriptData);
    } else if (transcriptionData?.transcript || transcriptionData?.timestampedTranscript) {
      // Transcript is stored directly in Firestore
      return NextResponse.json({
        transcript: transcriptionData.transcript,
        timestampedTranscript: transcriptionData.timestampedTranscript
      });
    } else {
      return NextResponse.json(
        { error: 'No transcript data found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('[API] Error fetching transcript from Storage:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch transcript',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
