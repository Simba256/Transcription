import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the transcription to verify ownership
    const transcriptionRef = adminDb.collection('transcriptions').doc(id);
    const transcriptionDoc = await transcriptionRef.get();

    if (!transcriptionDoc.exists) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    const transcription = transcriptionDoc.data();

    // Verify user owns this transcription
    if (transcription?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the desired sharing state from request body
    const { isShared } = await request.json();

    let shareId = null;

    if (isShared) {
      // Generate unique share ID
      shareId = `${id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await transcriptionRef.update({
        isShared: true,
        shareId,
        sharedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      // Disable sharing
      await transcriptionRef.update({
        isShared: false,
        shareId: null,
        sharedAt: null,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    return NextResponse.json({
      success: true,
      isShared,
      shareId,
      shareUrl: shareId ? `${process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : '')}/share/${shareId}` : null
    });

  } catch (error) {
    console.error('Error toggling transcript sharing:', error);
    return NextResponse.json(
      { error: 'Failed to update sharing settings' },
      { status: 500 }
    );
  }
}
