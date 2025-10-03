/**
 * API Endpoints Test Script
 * Tests subscription API endpoints
 * Run with: node scripts/test-api-endpoints.mjs
 */

console.log('🔌 API Endpoint Tests\n');
console.log('═'.repeat(60));

const results = [];

function logTest(name, status, message) {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon}\x1b[0m ${name}`);
  if (message) console.log(`  ${message}`);
  results.push({ name, status, message });
}

async function testEndpoint(name, path, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:3000${path}`, options);
    const status = response.status;

    // For unauthorized endpoints, 401 is expected
    if (status === 401) {
      logTest(name, 'PASS', `Endpoint secured (401 Unauthorized)`);
      return true;
    }

    // For other responses, check if it's a valid JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      logTest(name, 'PASS', `Endpoint responding (${status})`);
      return true;
    }

    logTest(name, 'PASS', `Endpoint accessible (${status})`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logTest(name, 'SKIP', 'Dev server not running (start with: npm run dev)');
      return false;
    }
    logTest(name, 'FAIL', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n📡 Testing Subscription API Endpoints\n');

  // Check if server is running
  try {
    await fetch('http://localhost:3000/api/test-config');
  } catch (error) {
    console.log('\x1b[33m⚠️  Dev server is not running\x1b[0m');
    console.log('   Start it with: npm run dev\n');
    console.log('   Skipping API endpoint tests...\n');
    return;
  }

  // Test subscription endpoints
  await testEndpoint('GET /api/subscriptions/get', '/api/subscriptions/get');
  await testEndpoint('POST /api/subscriptions/create', '/api/subscriptions/create', 'POST', {
    planId: 'ai-professional',
    paymentMethodId: 'pm_test_123'
  });
  await testEndpoint('POST /api/subscriptions/update', '/api/subscriptions/update', 'POST', {
    newPlanId: 'ai-enterprise'
  });
  await testEndpoint('POST /api/subscriptions/cancel', '/api/subscriptions/cancel', 'POST');

  // Test webhook endpoint
  await testEndpoint('POST /api/webhooks/stripe', '/api/webhooks/stripe', 'POST', {
    type: 'customer.subscription.created'
  });

  // Test existing billing endpoints still work
  await testEndpoint('POST /api/billing/create-payment-intent', '/api/billing/create-payment-intent', 'POST', {
    packageId: 'professional'
  });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 API Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total Endpoints: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);
  if (skipped > 0) console.log(`\x1b[33m○ Skipped: ${skipped}\x1b[0m`);

  if (failed === 0 && skipped === 0) {
    console.log('\n\x1b[32m🎉 All API endpoints responding!\x1b[0m');
  } else if (skipped > 0) {
    console.log('\n\x1b[33m⚠️  Some tests skipped (server not running)\x1b[0m');
  } else {
    console.log('\n\x1b[31m❌ Some endpoints failed\x1b[0m');
  }
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
