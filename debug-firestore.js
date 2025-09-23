const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugTranscription() {
  try {
    console.log('🔍 Debug: Examining Firestore transcriptions...');
    console.log('Project ID:', admin.app().options.projectId);

    // Get the most recent transcriptions
    const snapshot = await db.collection('transcriptions')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    if (snapshot.empty) {
      console.log('❌ No transcriptions found in Firestore');
      return;
    }

    console.log(`📊 Found ${snapshot.size} recent transcriptions:`);

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Transcription ${index + 1}: ${doc.id} ---`);
      console.log('Status:', data.status);
      console.log('Mode:', data.mode);
      console.log('Has transcript:', !!data.transcript);
      console.log('Transcript length:', data.transcript?.length || 0);
      console.log('Has timestampedTranscript:', !!data.timestampedTranscript);
      console.log('TimestampedTranscript type:', typeof data.timestampedTranscript);
      console.log('TimestampedTranscript length:', Array.isArray(data.timestampedTranscript) ? data.timestampedTranscript.length : 'not array');

      if (data.timestampedTranscript && Array.isArray(data.timestampedTranscript) && data.timestampedTranscript.length > 0) {
        console.log('First timestamp segment:', JSON.stringify(data.timestampedTranscript[0], null, 2));
        console.log('Last timestamp segment:', JSON.stringify(data.timestampedTranscript[data.timestampedTranscript.length - 1], null, 2));
      } else {
        console.log('❌ No timestamped segments found');
      }

      console.log('All field keys:', Object.keys(data));
      console.log('Created at:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('Updated at:', data.updatedAt?.toDate?.() || data.updatedAt);
    });

  } catch (error) {
    console.error('❌ Error examining Firestore:', error);
  } finally {
    admin.app().delete();
  }
}

debugTranscription();