import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Query Firestore for the shared transcription
    const transcriptionsRef = adminDb.collection('transcriptions');
    const query = transcriptionsRef
      .where('shareId', '==', shareId)
      .where('isShared', '==', true)
      .limit(1);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Shared transcript not found or is no longer available' },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Return the transcription data
    return NextResponse.json({
      id: doc.id,
      ...data,
      // Convert Firestore timestamps to ISO strings for JSON serialization
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
      completedAt: data.completedAt?.toDate().toISOString(),
      sharedAt: data.sharedAt?.toDate().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching shared transcript:', error);
    return NextResponse.json(
      { error: 'Failed to load shared transcript' },
      { status: 500 }
    );
  }
}
