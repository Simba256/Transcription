// Manual script to complete stuck transcription job
// Run: node manual-complete-job.js JOB_ID SPEECHMATICS_JOB_ID

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'transcription-a1b5a',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY || 'Djq8PzaPGgTE6NBTkkJ1OA2waMfGS9Gk';

async function fetchTranscript(speechmaticsJobId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'asr.api.speechmatics.com',
      path: `/v2/jobs/${speechmaticsJobId}/transcript?format=json-v2`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function completeJob(jobId, speechmaticsJobId) {
  try {
    console.log('🔍 Fetching job from Firestore...');
    const doc = await db.collection('transcriptions').doc(jobId).get();

    if (!doc.exists) {
      console.log('❌ Job not found:', jobId);
      return;
    }

    const data = doc.data();
    console.log('✅ Found job:', jobId);
    console.log('   Status:', data.status);
    console.log('   Mode:', data.mode);

    console.log('\n📥 Fetching transcript from Speechmatics...');
    const transcriptData = await fetchTranscript(speechmaticsJobId);

    console.log('✅ Received transcript data');
    console.log('   Results:', transcriptData.results?.length || 0, 'segments');

    // Create timestamped segments
    console.log('\n🔄 Processing timestamped segments...');
    const timestampedSegments = [];

    if (transcriptData.results && Array.isArray(transcriptData.results)) {
      let currentSentence = '';
      let sentenceStartTime = null;
      let sentenceEndTime = 0;
      let currentSpeaker = null;

      for (const result of transcriptData.results) {
        if (result.alternatives && result.alternatives[0] && result.alternatives[0].content) {
          const word = result.alternatives[0].content;
          const startTime = result.start_time || 0;
          const endTime = result.end_time || 0;
          const speakerId = result.speaker || result.alternatives[0].speaker || 'UU';

          if (sentenceStartTime === null && result.type === 'word') {
            sentenceStartTime = startTime;
            currentSpeaker = speakerId;
          }

          const speakerChanged = currentSpeaker && currentSpeaker !== speakerId && result.type === 'word';

          if (speakerChanged && currentSentence.trim()) {
            timestampedSegments.push({
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: currentSentence.trim(),
              speaker: currentSpeaker
            });

            currentSentence = word;
            sentenceStartTime = startTime;
            currentSpeaker = speakerId;
            sentenceEndTime = endTime;
          } else {
            if (result.type === 'punctuation' && result.attaches_to === 'previous') {
              currentSentence += word;
            } else if (result.type === 'word') {
              currentSentence += (currentSentence ? ' ' : '') + word;
              if (!currentSpeaker) currentSpeaker = speakerId;
            }
            sentenceEndTime = endTime;
          }

          const endsWithPunctuation = result.type === 'punctuation' && result.is_eos;

          if (endsWithPunctuation && currentSentence.trim()) {
            timestampedSegments.push({
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: currentSentence.trim(),
              speaker: currentSpeaker
            });

            currentSentence = '';
            sentenceStartTime = null;
            currentSpeaker = null;
            sentenceEndTime = 0;
          }
        }
      }

      if (currentSentence.trim() && sentenceStartTime !== null) {
        timestampedSegments.push({
          start: sentenceStartTime,
          end: sentenceEndTime,
          text: currentSentence.trim(),
          speaker: currentSpeaker
        });
      }
    }

    console.log('✅ Created', timestampedSegments.length, 'timestamped segments');

    // Extract plain text
    const plainTextTranscript = timestampedSegments.map(seg => seg.text).join(' ');

    console.log('\n💾 Saving to Firestore...');

    // Check size
    const dataSize = JSON.stringify({ transcript: transcriptData, timestampedTranscript: timestampedSegments }).length;
    const maxFirestoreSize = 900000; // 900KB

    console.log('   Data size:', (dataSize / 1024).toFixed(2), 'KB');

    if (dataSize > maxFirestoreSize) {
      console.log('   ⚠️  Data too large for Firestore, storing in Storage...');

      const bucket = admin.storage().bucket();
      const transcriptPath = `transcripts/${jobId}/transcript.json`;
      const transcriptFile = bucket.file(transcriptPath);

      await transcriptFile.save(JSON.stringify({
        transcript: plainTextTranscript,
        timestampedTranscript: timestampedSegments
      }), {
        contentType: 'application/json',
        metadata: {
          jobId: jobId,
          createdAt: new Date().toISOString()
        }
      });

      console.log('   ✅ Stored in Storage:', transcriptPath);

      await doc.ref.update({
        status: 'complete',
        transcriptStoragePath: transcriptPath,
        segmentCount: timestampedSegments.length,
        transcriptLength: plainTextTranscript.length,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      console.log('   ✅ Storing directly in Firestore');

      await doc.ref.update({
        status: 'complete',
        transcript: transcriptData,
        timestampedTranscript: timestampedSegments,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log('\n✅ Job completed successfully!');
    console.log('   Segments:', timestampedSegments.length);
    console.log('   Transcript length:', plainTextTranscript.length, 'characters');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

const jobId = process.argv[2];
const speechmaticsJobId = process.argv[3];

if (!jobId || !speechmaticsJobId) {
  console.log('Usage: node manual-complete-job.js JOB_ID SPEECHMATICS_JOB_ID');
  console.log('Example: node manual-complete-job.js jNWG0xaAc48mksDz4gil wx3coo9lb1');
  process.exit(1);
}

completeJob(jobId, speechmaticsJobId);
