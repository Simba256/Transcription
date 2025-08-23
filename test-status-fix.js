#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: './talk-to-text-nextjs/env.local' });

const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_API_URL = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';

async function testStatusParsing(jobId) {
  try {
    console.log(`🔍 Testing status parsing for job: ${jobId}\n`);

    const response = await axios.get(`${SPEECHMATICS_API_URL}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('📋 Raw API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Test the new parsing logic
    const jobData = response.data?.job;
    
    if (!jobData || !jobData.status) {
      console.error('❌ Status parsing would fail - missing job.status');
      return false;
    }
    
    console.log('\n✅ Status parsing successful!');
    console.log(`   Status: ${jobData.status}`);
    console.log(`   Duration: ${jobData.duration}s`);
    console.log(`   File: ${jobData.data_name}`);
    
    if (jobData.status === 'done') {
      console.log('\n📝 Job completed - ready for transcript retrieval');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing status parsing:', error.message);
    return false;
  }
}

// Test with the failing job ID
testStatusParsing('m3zj8gn8ji').then(success => {
  if (success) {
    console.log('\n🎉 Status parsing fix verified!');
  } else {
    console.log('\n❌ Status parsing still has issues');
  }
});