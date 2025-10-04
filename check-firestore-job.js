// Quick script to check a stuck transcription job in Firestore
// Run: node check-firestore-job.js JOB_ID

const admin = require('firebase-admin');
const path = require('path');

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

async function checkJob(jobId) {
  try {
    const doc = await db.collection('transcriptions').doc(jobId).get();

    if (!doc.exists) {
      console.log('❌ Job not found:', jobId);
      return;
    }

    const data = doc.data();

    console.log('\n📋 JOB DETAILS');
    console.log('='.repeat(50));
    console.log('Job ID:', jobId);
    console.log('Status:', data.status);
    console.log('Mode:', data.mode);
    console.log('Duration:', data.duration, 'seconds');
    console.log('Speechmatics Job ID:', data.speechmaticsJobId || '❌ NOT SET');
    console.log('Created:', data.createdAt?.toDate?.() || data.createdAt);
    console.log('Updated:', data.updatedAt?.toDate?.() || data.updatedAt);
    console.log('='.repeat(50));

    // Analysis
    console.log('\n🔍 ANALYSIS');
    console.log('='.repeat(50));

    if (!data.duration || data.duration === 0) {
      console.log('⚠️  WARNING: Duration is missing or 0!');
      console.log('   → This would cause synchronous processing and timeout');
      console.log('   → Solution: Deploy the updated code that defaults to webhook');
    } else if (data.duration > 300) {
      console.log('✅ Duration > 5 min - Should use WEBHOOK processing');
    } else {
      console.log('ℹ️  Duration < 5 min - Would use SYNCHRONOUS processing');
    }

    if (!data.speechmaticsJobId) {
      console.log('❌ Speechmatics Job ID missing!');
      console.log('   → Job was never submitted to Speechmatics');
      console.log('   → Check logs for submission errors');
    } else {
      console.log('✅ Speechmatics Job ID present:', data.speechmaticsJobId);
      console.log('   → Job was submitted successfully');
      console.log('   → May still be processing (30-60 min for long files)');
    }

    if (data.status === 'processing') {
      const now = new Date();
      const created = data.createdAt?.toDate?.() || new Date(data.createdAt);
      const minutesAgo = Math.floor((now - created) / 1000 / 60);

      console.log(`⏱️  Job has been processing for ${minutesAgo} minutes`);

      if (minutesAgo < 60) {
        console.log('   → This is normal, keep waiting');
      } else if (minutesAgo < 120) {
        console.log('   → Long file may still be processing');
      } else {
        console.log('   → Probably stuck, may need manual intervention');
      }
    }

    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

const jobId = process.argv[2];

if (!jobId) {
  console.log('Usage: node check-firestore-job.js JOB_ID');
  console.log('Example: node check-firestore-job.js jNWG0xaAc48mksDz4gil');
  process.exit(1);
}

checkJob(jobId);
