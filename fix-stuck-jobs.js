#!/usr/bin/env node

// This script helps fix stuck transcription jobs by manually polling Speechmatics
// and updating Firestore with the correct status

const axios = require('axios');
require('dotenv').config({ path: './talk-to-text-nextjs/env.local' });

const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_API_URL = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';

async function checkJobStatus(speechmaticsJobId) {
  try {
    const response = await axios.get(`${SPEECHMATICS_API_URL}/jobs/${speechmaticsJobId}`, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error(`Error checking job ${speechmaticsJobId}:`, error.message);
    return null;
  }
}

async function getTranscript(speechmaticsJobId) {
  try {
    const response = await axios.get(`${SPEECHMATICS_API_URL}/jobs/${speechmaticsJobId}/transcript`, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        'Accept': 'text/plain'
      },
      params: { format: 'txt' },
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error(`Error getting transcript for ${speechmaticsJobId}:`, error.message);
    return null;
  }
}

async function listRecentJobs() {
  try {
    console.log('🔍 Fetching recent Speechmatics jobs...\n');
    
    const response = await axios.get(`${SPEECHMATICS_API_URL}/jobs`, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      params: { limit: 10 }
    });

    const jobs = response.data.jobs || [];
    
    console.log(`Found ${jobs.length} recent jobs:\n`);
    
    for (const job of jobs) {
      const status = job.status;
      const duration = job.duration ? `${job.duration}s` : 'Unknown';
      const fileName = job.data_name || 'Unknown';
      const createdAt = job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown';
      
      console.log(`📄 Job ID: ${job.id}`);
      console.log(`   Status: ${status}`);
      console.log(`   File: ${fileName}`);
      console.log(`   Duration: ${duration}`);
      console.log(`   Created: ${createdAt}`);
      
      if (status === 'done') {
        console.log('   ✅ Job completed - transcript available');
        const transcript = await getTranscript(job.id);
        if (transcript) {
          console.log(`   📝 Transcript preview: "${transcript.substring(0, 100)}..."`);
        }
      } else if (status === 'running') {
        console.log('   ⏳ Job still processing...');
      } else if (status === 'rejected') {
        console.log('   ❌ Job was rejected');
      }
      
      console.log('');
    }

    return jobs;
  } catch (error) {
    console.error('❌ Error fetching jobs:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔧 Speechmatics Job Status Checker\n');
  
  if (!SPEECHMATICS_API_KEY) {
    console.error('❌ SPEECHMATICS_API_KEY not found in environment variables');
    return;
  }
  
  // Check if a specific job ID was provided
  const jobId = process.argv[2];
  
  if (jobId) {
    console.log(`🔍 Checking specific job: ${jobId}\n`);
    
    const job = await checkJobStatus(jobId);
    if (job) {
      console.log('📊 Job Details:');
      console.log(`   Status: ${job.status}`);
      console.log(`   File: ${job.data_name || 'Unknown'}`);
      console.log(`   Duration: ${job.duration ? job.duration + 's' : 'Unknown'}`);
      console.log(`   Created: ${job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown'}`);
      
      if (job.status === 'done') {
        console.log('\n📝 Getting transcript...');
        const transcript = await getTranscript(jobId);
        if (transcript) {
          console.log(`\n📄 TRANSCRIPT:\n${'='.repeat(50)}\n${transcript}\n${'='.repeat(50)}`);
        }
      }
    }
  } else {
    await listRecentJobs();
    
    console.log('\n💡 To check a specific job, run:');
    console.log('   node fix-stuck-jobs.js <speechmatics-job-id>');
  }
}

main().catch(console.error);