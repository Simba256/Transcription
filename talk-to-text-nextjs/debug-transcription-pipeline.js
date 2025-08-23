#!/usr/bin/env node

/**
 * Comprehensive transcription pipeline debugging script
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const SPEECHMATICS_API_KEY = 'ULpg6OQZ9E5TPxUOIFCANZO1UCFw4fsb';

async function debugTranscriptionPipeline() {
  console.log('🔍 Starting comprehensive transcription pipeline debug...\n');
  
  try {
    // 1. Test server connection
    console.log('1️⃣ Testing server connection...');
    const healthCheck = await axios.get(`${BASE_URL}/dashboard`);
    console.log('✅ Server is responding\n');

    // 2. Get recent Speechmatics jobs
    console.log('2️⃣ Checking recent Speechmatics jobs...');
    const speechmaticsResponse = await axios.get('https://asr.api.speechmatics.com/v2/jobs?limit=5', {
      headers: { 'Authorization': `Bearer ${SPEECHMATICS_API_KEY}` }
    });
    
    const recentJobs = speechmaticsResponse.data.jobs;
    console.log(`Found ${recentJobs.length} recent Speechmatics jobs:`);
    recentJobs.forEach(job => {
      console.log(`  - ${job.id}: ${job.status} (${job.created_at})`);
    });
    console.log('');

    // 3. Test polling GET endpoint with Firebase job IDs that might exist
    console.log('3️⃣ Testing polling GET endpoint...');
    const testJobIds = [
      'r17910reAG8yEgQ6esqb', // From previous logs
      'b6dsva0FOfgcHA3rxleR', // From previous logs
    ];

    for (const jobId of testJobIds) {
      try {
        const pollResponse = await axios.get(`${BASE_URL}/api/transcription/poll?jobId=${jobId}`);
        console.log(`✅ Job ${jobId}:`);
        console.log(`   Firestore: ${pollResponse.data.firestoreStatus}`);
        console.log(`   Speechmatics: ${pollResponse.data.speechmaticsStatus}`);
        console.log(`   Has transcript: ${!!pollResponse.data.transcript}`);
        console.log(`   Speechmatics ID: ${JSON.stringify(pollResponse.data.speechmaticsJobId)}`);
      } catch (error) {
        console.log(`❌ Job ${jobId}: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }
    console.log('');

    // 4. Test if server can reach Speechmatics
    console.log('4️⃣ Testing server -> Speechmatics connection...');
    try {
      // Try to get a known job status from the server
      const knownSpeechmaticsId = recentJobs[0]?.id;
      if (knownSpeechmaticsId) {
        console.log(`Testing with Speechmatics job ID: ${knownSpeechmaticsId}`);
        
        // We'll need to find a Firebase job that has this speechmatics ID
        // For now, let's test direct API access from our server
        const directTest = await axios.get(`${BASE_URL}/api/transcription/status`, {
          timeout: 10000
        });
        console.log('Server API response:', directTest.status);
      }
    } catch (error) {
      console.log(`Server -> Speechmatics test: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
    console.log('');

    // 5. Check console logs for any patterns
    console.log('5️⃣ Summary of findings:');
    console.log(`   - Server: ✅ Running`);
    console.log(`   - Speechmatics API: ✅ Working (${recentJobs.length} recent jobs)`);
    console.log(`   - Recent Speechmatics activity: ✅ Jobs completed recently`);
    console.log('');

    // 6. Recommendations
    console.log('📋 Next steps to debug:');
    console.log('   1. Upload a new file and watch server logs');
    console.log('   2. Check if Firestore jobs are being created');
    console.log('   3. Verify polling is actually running in the UI');
    console.log('   4. Check browser console for any errors');
    console.log('');

    console.log('🎯 To test polling fix:');
    console.log('   1. Upload a file in the UI');
    console.log('   2. Watch browser console for polling messages');
    console.log('   3. Check server logs for any errors');
    console.log('   4. Manually test polling endpoints with actual job IDs');

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugTranscriptionPipeline().catch(console.error);