#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Load environment variables from env.local
require('dotenv').config({ path: './talk-to-text-nextjs/env.local' });

const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_API_URL = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';
const AUDIO_FILE_PATH = './Audio/harvard.wav';

async function testSpeechmaticsAPI() {
  console.log('🎙️ Testing Speechmatics API...\n');

  // Check if API key is available
  if (!SPEECHMATICS_API_KEY) {
    console.error('❌ SPEECHMATICS_API_KEY not found in environment variables');
    return;
  }
  console.log('✅ API Key found');

  // Check if audio file exists
  if (!fs.existsSync(AUDIO_FILE_PATH)) {
    console.error('❌ Audio file not found:', AUDIO_FILE_PATH);
    return;
  }
  console.log('✅ Audio file found');

  try {
    // Test 1: API Connection
    console.log('\n📡 Testing API connection...');
    const connectionResponse = await axios.get(`${SPEECHMATICS_API_URL}/jobs`, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      params: { limit: 1 }
    });
    console.log('✅ API connection successful');

    // Test 2: Submit transcription job
    console.log('\n🚀 Submitting transcription job...');
    const formData = new FormData();
    formData.append('data_file', fs.createReadStream(AUDIO_FILE_PATH), 'harvard.wav');
    formData.append('config', JSON.stringify({
      type: 'transcription',
      transcription_config: {
        language: 'en'
      }
    }));

    const jobResponse = await axios.post(`${SPEECHMATICS_API_URL}/jobs`, formData, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    const jobId = jobResponse.data.id;
    console.log('✅ Job submitted successfully! Job ID:', jobId);

    // Test 3: Poll job status
    console.log('\n⏳ Polling job status...');
    let attempts = 0;
    const maxAttempts = 20; // 10 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      try {
        const statusResponse = await axios.get(`${SPEECHMATICS_API_URL}/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const job = statusResponse.data;
        console.log(`📊 Status check ${attempts + 1}: ${job.status}`);

        if (job.status === 'done') {
          console.log('✅ Transcription completed!');
          
          // Test 4: Get transcript
          console.log('\n📝 Retrieving transcript...');
          const transcriptResponse = await axios.get(`${SPEECHMATICS_API_URL}/jobs/${jobId}/transcript`, {
            headers: {
              'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
              'Accept': 'application/json'
            },
            params: { format: 'json-v2' },
            timeout: 30000
          });

          // Extract text from transcript
          const transcript = transcriptResponse.data;
          if (transcript.results) {
            const transcriptText = transcript.results
              .filter(result => result.type === 'word')
              .map(result => result.alternatives[0]?.content || '')
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            console.log('✅ Transcript retrieved successfully!\n');
            console.log('📄 TRANSCRIPT:');
            console.log('=' .repeat(50));
            console.log(transcriptText);
            console.log('=' .repeat(50));
          }
          
          return;
        } else if (job.status === 'rejected') {
          console.error('❌ Job was rejected by Speechmatics');
          return;
        }
        
        attempts++;
      } catch (error) {
        console.error(`⚠️ Status check failed (attempt ${attempts + 1}):`, error.message);
        attempts++;
      }
    }
    
    console.error('❌ Timeout: Job did not complete within expected time');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('   → Check your SPEECHMATICS_API_KEY');
    } else if (error.response?.status === 400) {
      console.error('   → Check your audio file format');
    } else if (error.response?.status === 429) {
      console.error('   → Rate limit exceeded, try again later');
    }
  }
}

// Run the test
testSpeechmaticsAPI().catch(console.error);