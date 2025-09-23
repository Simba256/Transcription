/**
 * Lightweight Validation Tests
 * Tests for Zod validation schemas without heavy testing frameworks
 */

const { validateData } = require('../src/lib/validation/schemas');

// Simple test runner
function runTest(name, testFn) {
  try {
    testFn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}. Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
  }
}

console.log('🧪 Running Validation Schema Tests...\n');

// Test 1: Valid transcription job data
runTest('Valid transcription job should pass validation', () => {
  const validJob = {
    filename: 'test.mp3',
    originalFilename: 'test.mp3',
    filePath: 'transcriptions/user123/test.mp3',
    downloadURL: 'https://firebasestorage.googleapis.com/test.mp3',
    status: 'processing',
    mode: 'ai',
    duration: 18.35619, // decimal duration should be allowed
    creditsUsed: 100
  };

  const result = validateData(validJob, CreateTranscriptionJobSchema);
  assertEqual(result.success, true, 'Valid job data should pass validation');
});

// Test 2: Invalid transcription job data
runTest('Invalid transcription job should fail validation', () => {
  const invalidJob = {
    filename: '', // empty filename should fail
    originalFilename: 'test.mp3',
    filePath: 'transcriptions/user123/test.mp3',
    downloadURL: 'invalid-url', // invalid URL should fail
    status: 'invalid-status', // invalid status should fail
    mode: 'invalid-mode', // invalid mode should fail
    duration: -5, // negative duration should fail
    creditsUsed: 100
  };

  const result = validateData(invalidJob, CreateTranscriptionJobSchema);
  assertEqual(result.success, false, 'Invalid job data should fail validation');
  assertEqual(result.errors.length > 0, true, 'Should have validation errors');
});

// Test 3: Duration decimal precision
runTest('Decimal duration should be accepted', () => {
  const jobWithDecimalDuration = {
    filename: 'test.mp3',
    originalFilename: 'test.mp3',
    filePath: 'transcriptions/user123/test.mp3',
    downloadURL: 'https://firebasestorage.googleapis.com/test.mp3',
    status: 'processing',
    mode: 'ai',
    duration: 18.35619, // This should pass now
    creditsUsed: 100
  };

  const result = validateData(jobWithDecimalDuration, CreateTranscriptionJobSchema);
  assertEqual(result.success, true, 'Decimal duration should be accepted');
});

// Test 4: Process transcription validation
runTest('Valid transcription process data should pass', () => {
  const validProcess = {
    jobId: 'abc123def456',
    language: 'en',
    operatingPoint: 'enhanced'
  };

  const result = validateData(validProcess, ProcessTranscriptionJobSchema);
  assertEqual(result.success, true, 'Valid process data should pass');
});

// Test 5: Invalid language code
runTest('Invalid language code should fail', () => {
  const invalidProcess = {
    jobId: 'abc123def456',
    language: 'invalid-lang', // Invalid language code
    operatingPoint: 'enhanced'
  };

  const result = validateData(invalidProcess, ProcessTranscriptionJobSchema);
  assertEqual(result.success, false, 'Invalid language code should fail');
});

console.log('\n✨ Validation tests completed!');