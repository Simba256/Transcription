/**
 * API Routes Validation Test
 * Validates that all subscription API routes exist
 * Run with: node scripts/test-api-routes.mjs
 */

console.log('🔌 API Routes Validation Tests\n');
console.log('═'.repeat(60));

const results = [];

function logTest(name, status, message) {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${icon}\x1b[0m ${name}`);
  if (message) console.log(`  ${message}`);
  results.push({ name, status, message });
}

async function runTests() {
  console.log('\n📡 Subscription API Routes\n');

  const fs = await import('fs');
  const path = await import('path');
  const fileUrl = await import('url');

  const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '..');

  // Test 1: Create subscription endpoint
  try {
    const filePath = path.join(projectRoot, 'src/app/api/subscriptions/create/route.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasPOST = content.includes('export async function POST');
      const hasAuth = content.includes('auth');

      if (hasPOST && hasAuth) {
        logTest('POST /api/subscriptions/create', 'PASS', 'Endpoint exists with authentication');
      } else {
        logTest('POST /api/subscriptions/create', 'FAIL', 'Missing POST handler or auth');
      }
    } else {
      logTest('POST /api/subscriptions/create', 'FAIL', 'Route file not found');
    }
  } catch (error) {
    logTest('POST /api/subscriptions/create', 'FAIL', error.message);
  }

  // Test 2: Update subscription endpoint
  try {
    const filePath = path.join(projectRoot, 'src/app/api/subscriptions/update/route.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasPOST = content.includes('export async function POST');
      const hasAuth = content.includes('auth');

      if (hasPOST && hasAuth) {
        logTest('POST /api/subscriptions/update', 'PASS', 'Endpoint exists with authentication');
      } else {
        logTest('POST /api/subscriptions/update', 'FAIL', 'Missing POST handler or auth');
      }
    } else {
      logTest('POST /api/subscriptions/update', 'FAIL', 'Route file not found');
    }
  } catch (error) {
    logTest('POST /api/subscriptions/update', 'FAIL', error.message);
  }

  // Test 3: Cancel subscription endpoint
  try {
    const filePath = path.join(projectRoot, 'src/app/api/subscriptions/cancel/route.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasPOST = content.includes('export async function POST');
      const hasAuth = content.includes('auth');

      if (hasPOST && hasAuth) {
        logTest('POST /api/subscriptions/cancel', 'PASS', 'Endpoint exists with authentication');
      } else {
        logTest('POST /api/subscriptions/cancel', 'FAIL', 'Missing POST handler or auth');
      }
    } else {
      logTest('POST /api/subscriptions/cancel', 'FAIL', 'Route file not found');
    }
  } catch (error) {
    logTest('POST /api/subscriptions/cancel', 'FAIL', error.message);
  }

  // Test 4: Get subscription endpoint
  try {
    const filePath = path.join(projectRoot, 'src/app/api/subscriptions/get/route.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasGET = content.includes('export async function GET');
      const hasAuth = content.includes('auth');

      if (hasGET && hasAuth) {
        logTest('GET /api/subscriptions/get', 'PASS', 'Endpoint exists with authentication');
      } else {
        logTest('GET /api/subscriptions/get', 'FAIL', 'Missing GET handler or auth');
      }
    } else {
      logTest('GET /api/subscriptions/get', 'FAIL', 'Route file not found');
    }
  } catch (error) {
    logTest('GET /api/subscriptions/get', 'FAIL', error.message);
  }

  // Test 5: Stripe webhook endpoint
  try {
    const filePath = path.join(projectRoot, 'src/app/api/webhooks/stripe/route.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasPOST = content.includes('export async function POST');
      const hasSubscriptionCreated = content.includes('customer.subscription.created');
      const hasSubscriptionUpdated = content.includes('customer.subscription.updated');
      const hasInvoicePayment = content.includes('invoice.payment_succeeded');

      if (hasPOST && hasSubscriptionCreated && hasSubscriptionUpdated && hasInvoicePayment) {
        logTest('POST /api/webhooks/stripe', 'PASS', 'Webhook handles subscription events');
      } else {
        logTest('POST /api/webhooks/stripe', 'FAIL', 'Missing webhook handlers');
      }
    } else {
      logTest('POST /api/webhooks/stripe', 'FAIL', 'Route file not found');
    }
  } catch (error) {
    logTest('POST /api/webhooks/stripe', 'FAIL', error.message);
  }

  console.log('\n💳 Billing API Routes\n');

  // Test 6: Create payment intent endpoint
  try {
    const filePath = path.join(projectRoot, 'src/app/api/billing/create-payment-intent/route.ts');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasPOST = content.includes('export async function POST');
      const hasStripe = content.includes('stripe');

      if (hasPOST && hasStripe) {
        logTest('POST /api/billing/create-payment-intent', 'PASS', 'Credit purchase endpoint exists');
      } else {
        logTest('POST /api/billing/create-payment-intent', 'FAIL', 'Missing handler');
      }
    } else {
      logTest('POST /api/billing/create-payment-intent', 'FAIL', 'Route file not found');
    }
  } catch (error) {
    logTest('POST /api/billing/create-payment-intent', 'FAIL', error.message);
  }

  console.log('\n🔒 Authentication & Authorization\n');

  // Test 7: Check auth middleware usage
  try {
    const files = [
      'src/app/api/subscriptions/create/route.ts',
      'src/app/api/subscriptions/update/route.ts',
      'src/app/api/subscriptions/cancel/route.ts',
      'src/app/api/subscriptions/get/route.ts'
    ];

    let allHaveAuth = true;
    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        allHaveAuth = false;
        break;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('auth') && !content.includes('getAuth') && !content.includes('verifyIdToken')) {
        allHaveAuth = false;
        break;
      }
    }

    if (allHaveAuth) {
      logTest('Authentication on subscription routes', 'PASS', 'All routes check authentication');
    } else {
      logTest('Authentication on subscription routes', 'FAIL', 'Missing auth checks');
    }
  } catch (error) {
    logTest('Authentication on subscription routes', 'FAIL', error.message);
  }

  console.log('\n📊 Error Handling\n');

  // Test 8: Check error handling
  try {
    const files = [
      'src/app/api/subscriptions/create/route.ts',
      'src/app/api/subscriptions/update/route.ts',
      'src/app/api/subscriptions/cancel/route.ts'
    ];

    let allHaveErrorHandling = true;
    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        allHaveErrorHandling = false;
        break;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('try') || !content.includes('catch')) {
        allHaveErrorHandling = false;
        break;
      }
    }

    if (allHaveErrorHandling) {
      logTest('Error handling in API routes', 'PASS', 'All routes have try-catch blocks');
    } else {
      logTest('Error handling in API routes', 'FAIL', 'Missing error handling');
    }
  } catch (error) {
    logTest('Error handling in API routes', 'FAIL', error.message);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 API Routes Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);

  const percentage = ((passed / total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${percentage}%`);

  if (failed === 0) {
    console.log('\n\x1b[32m🎉 All API route tests passed!\x1b[0m');
  } else {
    console.log('\n\x1b[31m❌ Some API route tests failed\x1b[0m');
  }

  console.log('\n💡 Note: Live endpoint testing requires dev server running (npm run dev)');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
