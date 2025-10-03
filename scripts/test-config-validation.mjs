/**
 * Configuration Validation Test
 * Validates subscription configuration and types
 * Run with: node scripts/test-config-validation.mjs
 */

console.log('🔧 Configuration Validation Tests\n');
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
  console.log('\n📦 Type Definitions Tests\n');

  // Test 1: Verify subscription types file exists
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileUrl = await import('url');

    const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');

    const typesPath = path.join(projectRoot, 'src/types/subscription.ts');
    if (fs.existsSync(typesPath)) {
      const content = fs.readFileSync(typesPath, 'utf8');
      const hasSubscriptionPlan = content.includes('export interface SubscriptionPlan');
      const hasUserData = content.includes('export interface UserSubscriptionData');
      const hasUsageRecord = content.includes('export interface UsageRecord');

      if (hasSubscriptionPlan && hasUserData && hasUsageRecord) {
        logTest('Subscription type definitions', 'PASS', 'All required types defined');
      } else {
        logTest('Subscription type definitions', 'FAIL', 'Missing required type definitions');
      }
    } else {
      logTest('Subscription type definitions', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Subscription type definitions', 'FAIL', error.message);
  }

  console.log('\n⚙️  Plans Configuration Tests\n');

  // Test 2: Verify plans configuration
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileUrl = await import('url');

    const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');

    const plansPath = path.join(projectRoot, 'src/lib/subscriptions/plans.ts');
    if (fs.existsSync(plansPath)) {
      const content = fs.readFileSync(plansPath, 'utf8');

      // Check for all 6 plans
      const hasAIStarter = content.includes("'ai-starter'");
      const hasAIProfessional = content.includes("'ai-professional'");
      const hasAIEnterprise = content.includes("'ai-enterprise'");
      const hasHybridStarter = content.includes("'hybrid-starter'");
      const hasHybridProfessional = content.includes("'hybrid-professional'");
      const hasHybridEnterprise = content.includes("'hybrid-enterprise'");

      if (hasAIStarter && hasAIProfessional && hasAIEnterprise &&
          hasHybridStarter && hasHybridProfessional && hasHybridEnterprise) {
        logTest('All 6 subscription plans defined', 'PASS', 'AI and Hybrid plans configured');
      } else {
        logTest('All 6 subscription plans defined', 'FAIL', 'Missing plan definitions');
      }

      // Check pricing
      const has210 = content.includes('price: 210');
      const has488 = content.includes('price: 488');
      const has900 = content.includes('price: 900');
      const has325 = content.includes('price: 325');
      const has1050 = content.includes('price: 1050');
      const has1950 = content.includes('price: 1950');

      if (has210 && has488 && has900 && has325 && has1050 && has1950) {
        logTest('Plan pricing configured', 'PASS', 'All prices set correctly');
      } else {
        logTest('Plan pricing configured', 'FAIL', 'Incorrect pricing');
      }

      // Check minutes allocation
      const has300mins = content.includes('includedMinutes: 300');
      const has750mins = content.includes('includedMinutes: 750');
      const has1500mins = content.includes('includedMinutes: 1500');

      if (has300mins && has750mins && has1500mins) {
        logTest('Minute allocations configured', 'PASS', '300/750/1500 minutes');
      } else {
        logTest('Minute allocations configured', 'FAIL', 'Incorrect minute allocations');
      }

      // Check free trial
      const hasTrial = content.includes('includedMinutes: 180');
      if (hasTrial) {
        logTest('Free trial configuration', 'PASS', '180 minutes (3 hours)');
      } else {
        logTest('Free trial configuration', 'FAIL', 'Trial not configured');
      }
    } else {
      logTest('Plans configuration file', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Plans configuration', 'FAIL', error.message);
  }

  console.log('\n🔄 Usage Tracking Tests\n');

  // Test 3: Verify usage tracking utilities
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileUrl = await import('url');

    const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');

    const usagePath = path.join(projectRoot, 'src/lib/subscriptions/usage.ts');
    if (fs.existsSync(usagePath)) {
      const content = fs.readFileSync(usagePath, 'utf8');

      const hasReserve = content.includes('export async function reserveMinutes');
      const hasConfirm = content.includes('export async function confirmMinuteUsage');
      const hasRelease = content.includes('export async function releaseReservedMinutes');
      const hasReset = content.includes('export async function resetMonthlyUsage');

      if (hasReserve && hasConfirm && hasRelease && hasReset) {
        logTest('Usage tracking functions', 'PASS', 'All core functions implemented');
      } else {
        logTest('Usage tracking functions', 'FAIL', 'Missing functions');
      }

      // Check for transaction safety
      const hasTransaction = content.includes('runTransaction');
      if (hasTransaction) {
        logTest('Atomic operations', 'PASS', 'Using Firestore transactions');
      } else {
        logTest('Atomic operations', 'FAIL', 'No transaction safety');
      }
    } else {
      logTest('Usage tracking file', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Usage tracking', 'FAIL', error.message);
  }

  console.log('\n💳 Stripe Integration Tests\n');

  // Test 4: Verify Stripe integration
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileUrl = await import('url');

    const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');

    const stripePath = path.join(projectRoot, 'src/lib/stripe/subscriptions.ts');
    if (fs.existsSync(stripePath)) {
      const content = fs.readFileSync(stripePath, 'utf8');

      const hasCreate = content.includes('export async function createSubscription');
      const hasUpdate = content.includes('export async function updateSubscription');
      const hasCancel = content.includes('export async function cancelSubscription');
      const hasReactivate = content.includes('export async function reactivateSubscription');

      if (hasCreate && hasUpdate && hasCancel && hasReactivate) {
        logTest('Stripe subscription functions', 'PASS', 'All CRUD operations implemented');
      } else {
        logTest('Stripe subscription functions', 'FAIL', 'Missing operations');
      }
    } else {
      logTest('Stripe integration file', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Stripe integration', 'FAIL', error.message);
  }

  console.log('\n🔌 API Routes Tests\n');

  // Test 5: Verify API routes exist
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileUrl = await import('url');

    const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');

    const apiBase = path.join(projectRoot, 'src/app/api/subscriptions');

    const createExists = fs.existsSync(path.join(apiBase, 'create/route.ts'));
    const updateExists = fs.existsSync(path.join(apiBase, 'update/route.ts'));
    const cancelExists = fs.existsSync(path.join(apiBase, 'cancel/route.ts'));
    const getExists = fs.existsSync(path.join(apiBase, 'get/route.ts'));

    if (createExists && updateExists && cancelExists && getExists) {
      logTest('Subscription API routes', 'PASS', 'All 4 endpoints present');
    } else {
      const missing = [];
      if (!createExists) missing.push('create');
      if (!updateExists) missing.push('update');
      if (!cancelExists) missing.push('cancel');
      if (!getExists) missing.push('get');
      logTest('Subscription API routes', 'FAIL', `Missing: ${missing.join(', ')}`);
    }

    // Check webhook
    const webhookExists = fs.existsSync(path.join(projectRoot, 'src/app/api/webhooks/stripe/route.ts'));
    if (webhookExists) {
      const content = fs.readFileSync(path.join(projectRoot, 'src/app/api/webhooks/stripe/route.ts'), 'utf8');
      const hasSubscriptionEvents = content.includes('customer.subscription.created') &&
                                     content.includes('customer.subscription.updated') &&
                                     content.includes('invoice.payment_succeeded');
      if (hasSubscriptionEvents) {
        logTest('Stripe webhook handler', 'PASS', 'Subscription events handled');
      } else {
        logTest('Stripe webhook handler', 'FAIL', 'Missing event handlers');
      }
    } else {
      logTest('Stripe webhook handler', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('API routes', 'FAIL', error.message);
  }

  console.log('\n🔒 Firestore Rules Tests\n');

  // Test 6: Verify Firestore rules
  try {
    const fs = await import('fs');
    const path = await import('path');
    const fileUrl = await import('url');

    const __dirname = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');

    const rulesPath = path.join(projectRoot, 'firestore.rules');
    if (fs.existsSync(rulesPath)) {
      const content = fs.readFileSync(rulesPath, 'utf8');

      const hasSubscriptions = content.includes('match /subscriptions/{subscriptionId}');
      const hasUsageRecords = content.includes('match /usageRecords/{recordId}');
      const hasEvents = content.includes('match /subscriptionEvents/{eventId}');

      if (hasSubscriptions && hasUsageRecords && hasEvents) {
        logTest('Firestore security rules', 'PASS', 'All subscription collections secured');
      } else {
        logTest('Firestore security rules', 'FAIL', 'Missing rules');
      }
    } else {
      logTest('Firestore security rules', 'FAIL', 'File not found');
    }
  } catch (error) {
    logTest('Firestore rules', 'FAIL', error.message);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Configuration Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);

  const percentage = ((passed / total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${percentage}%`);

  if (failed === 0) {
    console.log('\n\x1b[32m🎉 All configuration tests passed!\x1b[0m');
  } else {
    console.log('\n\x1b[31m❌ Some configuration tests failed\x1b[0m');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
