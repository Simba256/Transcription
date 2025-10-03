import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin';

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
        { error: 'Shared transcript not found' },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // If transcript is stored in Storage, fetch it
    if (data.transcriptStoragePath) {
      try {
        const bucket = adminStorage.bucket();
        const file = bucket.file(data.transcriptStoragePath);
        const [contents] = await file.download();
        const transcriptData = JSON.parse(contents.toString());

        return NextResponse.json({
          timestampedTranscript: transcriptData.timestampedTranscript || []
        });
      } catch (error) {
        console.error('Error fetching transcript from storage:', error);
        return NextResponse.json(
          { error: 'Failed to load transcript data' },
          { status: 500 }
        );
      }
    }

    // Return timestamped transcript if available in Firestore
    return NextResponse.json({
      timestampedTranscript: data.timestampedTranscript || []
    });

  } catch (error) {
    console.error('Error fetching shared transcript data:', error);
    return NextResponse.json(
      { error: 'Failed to load transcript' },
      { status: 500 }
    );
  }
}
