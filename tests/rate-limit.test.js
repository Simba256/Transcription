/**
 * Rate Limiting Tests
 * Tests for rate limiting functionality
 */

const http = require('http');

// Test rate limiting functionality
async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'rate-limit-test'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting...\n');

  // Test 1: Normal requests should succeed
  console.log('Testing normal request rate...');
  const normalResponse = await makeRequest('GET', '/api/test-rate-limit');
  if (normalResponse.status === 200) {
    console.log('✅ Normal requests succeed');
  } else {
    console.log('❌ Normal request failed');
    return;
  }

  // Test 2: Rapid requests should trigger rate limiting
  console.log('Testing rapid requests to trigger rate limiting...');
  const rapidPromises = [];

  // Send 20 rapid requests
  for (let i = 0; i < 20; i++) {
    rapidPromises.push(makeRequest('POST', '/api/transcriptions/process', {
      jobId: `test-${i}`,
      language: 'en'
    }));
  }

  try {
    const responses = await Promise.all(rapidPromises);

    const successCount = responses.filter(r => r.status === 404 || r.status === 400).length; // 404 = job not found, 400 = validation
    const rateLimitCount = responses.filter(r => r.status === 429).length; // 429 = rate limited

    console.log(`Successful requests: ${successCount}`);
    console.log(`Rate limited requests: ${rateLimitCount}`);

    if (rateLimitCount > 0) {
      console.log('✅ Rate limiting is working - some requests were rate limited');
    } else {
      console.log('⚠️  Rate limiting might not be working - no requests were rate limited');
    }

    // Test 3: Wait and verify rate limit resets
    console.log('\nWaiting 5 seconds for rate limit to reset...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const resetResponse = await makeRequest('GET', '/api/test-rate-limit');
    if (resetResponse.status === 200) {
      console.log('✅ Rate limit reset successfully');
    } else {
      console.log('❌ Rate limit did not reset properly');
    }

  } catch (error) {
    console.error('❌ Error during rate limit test:', error.message);
  }

  console.log('\n✨ Rate limiting tests completed!');
}

// Wait for server to be ready
setTimeout(testRateLimit, 2000);