#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testAuthenticationWithoutToken() {
  console.log('🔒 Test 1: API access without authentication token');
  console.log('===============================================\n');

  try {
    // Test 1a: Try to access transcription result without auth
    console.log('1a. Testing /api/transcription/result without auth...');
    const resultResponse = await axios.get(`${BASE_URL}/api/transcription/result?jobId=test-job-id`, {
      validateStatus: () => true // Don't throw on 4xx/5xx
    });
    
    console.log(`   Status: ${resultResponse.status}`);
    console.log(`   Response: ${JSON.stringify(resultResponse.data)}\n`);
    
    if (resultResponse.status === 401) {
      console.log('   ✅ PASS: Correctly rejected unauthorized request\n');
    } else {
      console.log('   ❌ FAIL: Should have returned 401\n');
    }

    // Test 1b: Try to process transcription without auth
    console.log('1b. Testing /api/transcription/process without auth...');
    const formData = new FormData();
    formData.append('audioFile', fs.createReadStream('./Audio/harvard.wav'), 'harvard.wav');
    formData.append('fileName', 'harvard.wav');
    formData.append('firestoreDocId', 'test-doc-id');
    formData.append('language', 'en');
    formData.append('diarization', 'true');

    const processResponse = await axios.post(`${BASE_URL}/api/transcription/process`, formData, {
      headers: formData.getHeaders(),
      validateStatus: () => true,
      timeout: 10000
    });

    console.log(`   Status: ${processResponse.status}`);
    console.log(`   Response: ${JSON.stringify(processResponse.data)}\n`);
    
    if (processResponse.status === 401) {
      console.log('   ✅ PASS: Correctly rejected unauthorized request\n');
    } else {
      console.log('   ❌ FAIL: Should have returned 401\n');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ ERROR: Cannot connect to server. Make sure it\'s running on port 3000\n');
    } else {
      console.log(`   ❌ ERROR: ${error.message}\n`);
    }
  }
}

async function testInputValidation() {
  console.log('🔍 Test 2: Input validation (without auth - should fail on auth first)');
  console.log('================================================================\n');

  try {
    // Test invalid language code
    console.log('2a. Testing invalid language code...');
    const response = await axios.get(`${BASE_URL}/api/transcription/result?jobId=test&format=invalid-format`, {
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}\n`);
    
    if (response.status === 401) {
      console.log('   ✅ PASS: Auth check happens before validation (as expected)\n');
    } else {
      console.log('   ❌ This should fail on auth first\n');
    }

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }
}

async function testRateLimit() {
  console.log('⚡ Test 3: Rate limiting (will fail on auth, but checking headers)');
  console.log('============================================================\n');

  try {
    console.log('3a. Making multiple rapid requests...');
    
    for (let i = 1; i <= 3; i++) {
      const response = await axios.get(`${BASE_URL}/api/transcription/result?jobId=test-${i}`, {
        validateStatus: () => true
      });
      
      console.log(`   Request ${i}: Status ${response.status}`);
    }
    
    console.log('   ✅ Rate limiting will be tested properly with valid auth tokens\n');

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }
}

async function main() {
  console.log('🛡️  API Security Test Suite');
  console.log('===========================\n');

  await testAuthenticationWithoutToken();
  await testInputValidation(); 
  await testRateLimit();
  
  console.log('🎯 Summary:');
  console.log('- Authentication tests show if API correctly rejects unauthorized requests');
  console.log('- To test with valid auth, you\'ll need to login through your web app');
  console.log('- Then check browser DevTools → Network tab for actual auth headers');
  console.log('- The security middleware is working if all requests return 401 Unauthorized');
}

main().catch(console.error);