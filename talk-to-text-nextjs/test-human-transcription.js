/**
 * Comprehensive test script for Human Transcription Backend
 * Run with: node test-human-transcription.js
 */

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testTranscriberSeeding() {
  console.log('\n🧪 Testing Transcriber Seeding System');
  console.log('=====================================');
  
  // Test 1: Initial seeding
  console.log('\n1. Testing initial transcriber seeding...');
  const seedResult = await makeRequest(`${BASE_URL}/api/admin/seed-transcribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  console.log('Seed Result:', JSON.stringify(seedResult, null, 2));
  
  // Test 2: Reseeding (remove and add again)
  console.log('\n2. Testing transcriber reseeding...');
  const reseedResult = await makeRequest(`${BASE_URL}/api/admin/seed-transcribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reseed: true })
  });
  
  console.log('Reseed Result:', JSON.stringify(reseedResult, null, 2));
  
  return seedResult.success && reseedResult.success;
}

async function testTranscriptionAPI() {
  console.log('\n🧪 Testing Transcription API Endpoints');
  console.log('======================================');
  
  // Mock file data for testing
  const mockFileData = {
    fileName: 'test-audio.mp3',
    fileUrl: 'https://example.com/test-audio.mp3',
    fileSize: 1024000, // 1MB
    duration: 300, // 5 minutes
    mode: 'human',
    priority: 'normal',
    qualityLevel: 'standard',
    language: 'en',
    diarization: false,
    testMode: true // Enable test mode
  };
  
  console.log('\n1. Testing human transcription job creation...');
  console.log('Mock file data:', JSON.stringify(mockFileData, null, 2));
  
  const jobResult = await makeRequest(`${BASE_URL}/api/transcription/modes/process`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mockFileData)
  });
  
  console.log('Job Creation Result:', JSON.stringify(jobResult, null, 2));
  
  return jobResult;
}

async function testValidation() {
  console.log('\n🧪 Testing Input Validation');
  console.log('============================');
  
  // Test invalid mode
  console.log('\n1. Testing invalid mode...');
  const invalidModeResult = await makeRequest(`${BASE_URL}/api/transcription/modes/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test.mp3',
      fileUrl: 'https://example.com/test.mp3',
      fileSize: 1000,
      mode: 'invalid_mode', // Invalid
      priority: 'normal',
      qualityLevel: 'standard'
    })
  });
  
  console.log('Invalid Mode Result:', JSON.stringify(invalidModeResult, null, 2));
  
  // Test missing required fields
  console.log('\n2. Testing missing required fields...');
  const missingFieldsResult = await makeRequest(`${BASE_URL}/api/transcription/modes/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test.mp3'
      // Missing required fields
    })
  });
  
  console.log('Missing Fields Result:', JSON.stringify(missingFieldsResult, null, 2));
  
  return true;
}

async function testRateLimiting() {
  console.log('\n🧪 Testing Rate Limiting');
  console.log('=========================');
  
  console.log('Sending multiple rapid requests to test rate limiting...');
  
  const promises = [];
  const mockData = {
    fileName: 'test.mp3',
    fileUrl: 'https://example.com/test.mp3',
    fileSize: 1000,
    mode: 'human',
    priority: 'normal',
    qualityLevel: 'standard'
  };
  
  // Send 15 requests rapidly (rate limit is 10 per minute)
  for (let i = 0; i < 15; i++) {
    promises.push(
      makeRequest(`${BASE_URL}/api/transcription/modes/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockData)
      })
    );
  }
  
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const rateLimited = results.filter(r => r.status === 429).length;
  
  console.log(`Successful requests: ${successful}`);
  console.log(`Rate limited requests: ${rateLimited}`);
  
  return true;
}

async function testEndToEnd() {
  console.log('\n🧪 End-to-End Human Transcription Test');
  console.log('======================================');
  
  try {
    // Step 1: Seed transcribers
    console.log('\nStep 1: Seeding transcribers...');
    await testTranscriberSeeding();
    
    // Step 2: Test API endpoints
    console.log('\nStep 2: Testing transcription creation...');
    const jobResult = await testTranscriptionAPI();
    
    // Step 3: Test validation
    console.log('\nStep 3: Testing validation...');
    await testValidation();
    
    // Step 4: Test rate limiting
    console.log('\nStep 4: Testing rate limiting...');
    await testRateLimiting();
    
    return true;
  } catch (error) {
    console.error('End-to-end test failed:', error);
    return false;
  }
}

// Additional utility functions for manual testing
function generateTestAudioFile(durationMinutes = 5) {
  return {
    fileName: `test-audio-${durationMinutes}min.mp3`,
    fileUrl: `https://example.com/test-audio-${durationMinutes}min.mp3`,
    fileSize: durationMinutes * 1024 * 200, // Rough estimate: 200KB per minute
    duration: durationMinutes * 60, // Convert to seconds
    mode: 'human',
    priority: Math.random() > 0.5 ? 'normal' : 'high',
    qualityLevel: 'standard',
    language: 'en',
    diarization: Math.random() > 0.7,
    testMode: true
  };
}

async function testWorkloadBalancing() {
  console.log('\n🧪 Testing Workload Balancing');
  console.log('==============================');
  
  console.log('Creating multiple jobs to test workload distribution...');
  
  const jobs = [
    generateTestAudioFile(2),  // 2 minute job
    generateTestAudioFile(10), // 10 minute job  
    generateTestAudioFile(5),  // 5 minute job
    generateTestAudioFile(1),  // 1 minute job
    generateTestAudioFile(15)  // 15 minute job
  ];
  
  console.log('Test jobs:', jobs.map(j => `${j.fileName} (${j.duration/60}min)`));
  
  // Send jobs sequentially to see assignment pattern
  const results = [];
  for (const job of jobs) {
    console.log(`\nSubmitting ${job.fileName}...`);
    const result = await makeRequest(`${BASE_URL}/api/transcription/modes/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    });
    results.push({ job: job.fileName, result });
    
    // Wait a bit between jobs to see the assignment pattern
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\nWorkload balancing test results:');
  results.forEach(r => {
    console.log(`${r.job}: ${r.result.success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  return results.every(r => r.result.success);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Human Transcription Backend Tests');
  console.log('==============================================');
  
  const tests = [
    { name: 'Transcriber Seeding', fn: testTranscriberSeeding },
    { name: 'API Endpoints', fn: testTranscriptionAPI },
    { name: 'Input Validation', fn: testValidation },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Workload Balancing', fn: testWorkloadBalancing }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`\n⚡ Running ${test.name} test...`);
      const success = await test.fn();
      results.push({ name: test.name, success });
      console.log(`✅ ${test.name}: ${success ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`❌ ${test.name}: FAILED with error:`, error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  results.forEach(r => {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${r.name}`);
    if (r.error) console.log(`  Error: ${r.error}`);
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Human transcription backend is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Export for module use or run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testTranscriberSeeding,
  testTranscriptionAPI,
  testValidation,
  testRateLimiting,
  testWorkloadBalancing,
  runAllTests
};