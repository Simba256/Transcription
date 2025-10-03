import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Check if transcript is in Storage
    const transcriptStoragePath = transcriptionData?.transcriptStoragePath;

    if (!transcriptStoragePath) {
      return NextResponse.json(
        { error: 'Transcript not stored in Storage' },
        { status: 404 }
      );
    }

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
