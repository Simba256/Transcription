/**
 * Lightweight API Endpoint Tests
 * Tests for critical API endpoints without heavy frameworks
 */

const http = require('http');
const { URL } = require('url');

// Simple HTTP test client
async function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Simple test runner
function runTest(name, testFn) {
  return testFn()
    .then(() => console.log(`✅ ${name}`))
    .catch(error => console.error(`❌ ${name}: ${error.message}`));
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

console.log('🧪 Running API Endpoint Tests...\n');

async function runApiTests() {
  // Test 1: Configuration endpoint
  await runTest('GET /api/test-config should return 200', async () => {
    const response = await makeRequest('GET', '/api/test-config');
    assertEqual(response.status, 200, 'Config endpoint should return 200');
  });

  // Test 2: Rate limiting endpoint
  await runTest('GET /api/test-rate-limit should return 200', async () => {
    const response = await makeRequest('GET', '/api/test-rate-limit');
    assertEqual(response.status, 200, 'Rate limit endpoint should return 200');
  });

  // Test 3: Unauthenticated transcription creation should fail
  await runTest('POST /api/transcriptions/create without auth should return 401', async () => {
    const response = await makeRequest('POST', '/api/transcriptions/create', {
      filename: 'test.mp3',
      originalFilename: 'test.mp3',
      filePath: 'test/path',
      downloadURL: 'https://example.com/test.mp3',
      status: 'processing',
      mode: 'ai',
      duration: 60,
      creditsUsed: 100
    });
    assertEqual(response.status, 401, 'Should require authentication');
  });

  // Test 4: Invalid data validation
  await runTest('POST /api/transcriptions/process with invalid data should return 400', async () => {
    const response = await makeRequest('POST', '/api/transcriptions/process', {
      jobId: '', // Invalid empty jobId
      language: 'invalid-lang' // Invalid language
    });
    assertEqual(response.status, 400, 'Should reject invalid data');
  });

  // Test 5: Rate limiting should work
  await runTest('Multiple rapid requests should trigger rate limiting', async () => {
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(makeRequest('POST', '/api/transcriptions/process', {
        jobId: 'test',
        language: 'en'
      }));
    }

    const responses = await Promise.all(promises);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;

    if (rateLimitedCount === 0) {
      throw new Error('Expected some requests to be rate limited');
    }
  });

  console.log('\n✨ API tests completed!');
}

// Wait a moment for server to be ready, then run tests
setTimeout(runApiTests, 1000);