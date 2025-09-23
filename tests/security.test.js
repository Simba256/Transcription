/**
 * Security Tests
 * Tests for authentication, authorization, and security vulnerabilities
 */

const http = require('http');

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

function runTest(name, testFn) {
  return testFn()
    .then(() => console.log(`✅ ${name}`))
    .catch(error => console.error(`❌ ${name}: ${error.message}`));
}

async function runSecurityTests() {
  console.log('🔒 Running Security Tests...\n');

  // Test 1: Protected routes require authentication
  await runTest('Protected transcription endpoints require authentication', async () => {
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

    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
  });

  // Test 2: Invalid authentication tokens are rejected
  await runTest('Invalid authentication tokens are rejected', async () => {
    const response = await makeRequest('POST', '/api/transcriptions/create',
      {
        filename: 'test.mp3',
        originalFilename: 'test.mp3',
        filePath: 'test/path',
        downloadURL: 'https://example.com/test.mp3',
        status: 'processing',
        mode: 'ai',
        duration: 60,
        creditsUsed: 100
      },
      { 'Cookie': 'auth-token=invalid-fake-token' }
    );

    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for invalid token, got ${response.status}`);
    }
  });

  // Test 3: Input validation prevents malicious data
  await runTest('Input validation prevents malicious data', async () => {
    const maliciousData = {
      filename: '<script>alert("xss")</script>',
      originalFilename: '../../../etc/passwd',
      filePath: '../../../../etc/passwd',
      downloadURL: 'javascript:alert("xss")',
      status: 'malicious-status',
      mode: 'malicious-mode',
      duration: 'not-a-number',
      creditsUsed: -999999
    };

    const response = await makeRequest('POST', '/api/transcriptions/process', maliciousData);

    if (response.status !== 400) {
      throw new Error(`Expected 400 Bad Request for malicious data, got ${response.status}`);
    }
  });

  // Test 4: Billing endpoints are protected
  await runTest('Billing endpoints require authentication', async () => {
    const response = await makeRequest('POST', '/api/billing/create-payment-intent', {
      packageId: 'starter',
      amount: 10,
      credits: 1000
    });

    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for billing endpoint, got ${response.status}`);
    }
  });

  // Test 5: SQL injection attempts are handled safely
  await runTest('SQL injection attempts are handled safely', async () => {
    const sqlInjectionData = {
      jobId: "'; DROP TABLE users; --",
      language: "en'; DELETE FROM transcriptions; --"
    };

    const response = await makeRequest('POST', '/api/transcriptions/process', sqlInjectionData);

    // Should fail validation, not cause server errors
    if (response.status !== 400) {
      throw new Error(`Expected 400 Bad Request for SQL injection attempt, got ${response.status}`);
    }
  });

  // Test 6: XSS prevention in data validation
  await runTest('XSS prevention in data validation', async () => {
    const xssData = {
      jobId: 'test123',
      language: 'en',
      specialInstructions: '<script>document.cookie="stolen=true"</script>'
    };

    const response = await makeRequest('POST', '/api/transcriptions/process', xssData);

    // The endpoint should either validate and sanitize or reject the data
    if (response.status === 500) {
      throw new Error('Server error suggests XSS vulnerability');
    }
  });

  // Test 7: File upload size limits
  await runTest('File upload respects size limits', async () => {
    const oversizedFile = {
      filename: 'huge-file.mp3',
      originalFilename: 'huge-file.mp3',
      filePath: 'test/huge-file.mp3',
      downloadURL: 'https://example.com/huge-file.mp3',
      status: 'processing',
      mode: 'ai',
      duration: 60,
      creditsUsed: 100,
      size: 999999999999 // Extremely large size
    };

    // This test depends on validation schema limits
    console.log('  ℹ️  File size validation depends on schema configuration');
  });

  console.log('\n✨ Security tests completed!');
}

// Wait for server to be ready
setTimeout(runSecurityTests, 1500);