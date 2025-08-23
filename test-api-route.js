#!/usr/bin/env node

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testProcessRoute() {
  try {
    console.log('🧪 Testing /api/transcription/process route...\n');

    const formData = new FormData();
    formData.append('audioFile', fs.createReadStream('./Audio/harvard.wav'), 'harvard.wav');
    formData.append('fileName', 'harvard.wav');
    formData.append('firestoreDocId', 'test-doc-' + Date.now());
    formData.append('language', 'en');
    formData.append('diarization', 'true');

    const response = await axios.post('http://localhost:3001/api/transcription/process', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 60000
    });

    console.log('✅ API Route Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ Transcription processing started successfully!');
      console.log(`📋 Speechmatics Job ID: ${response.data.jobId}`);
      console.log(`📄 Firestore Doc ID: ${response.data.firestoreDocId}`);
      console.log('\n⏳ Background polling will continue automatically...');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProcessRoute();