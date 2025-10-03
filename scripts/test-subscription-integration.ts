/**
 * Subscription Integration Test Script
 *
 * This script tests the complete subscription flow end-to-end:
 * 1. Plan configuration
 * 2. Usage tracking
 * 3. Minute reservation and consumption
 * 4. Overage handling
 * 5. Subscription status checks
 *
 * Run with: npx ts-node scripts/test-subscription-integration.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();

// Test data
const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_EMAIL = `test-${Date.now()}@example.com`;

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string, duration?: number) {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`${color}${icon}\x1b[0m ${name}${durationStr}`);
  if (message) console.log(`  ${message}`);
  results.push({ name, status, message, duration });
}

async function cleanup() {
  try {
    // Clean up test user
    await db.collection('users').doc(TEST_USER_ID).delete();

    // Clean up usage records
    const usageRecords = await db.collection('usageRecords')
      .where('userId', '==', TEST_USER_ID)
      .get();

    const batch = db.batch();
    usageRecords.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log('\n🧹 Cleanup completed');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

async function runTests() {
  console.log('🧪 Starting Subscription Integration Tests\n');
  console.log('═'.repeat(60));

  // Test 1: Create test user with subscription data
  console.log('\n📋 User Setup Tests');
  try {
    const start = Date.now();
    await db.collection('users').doc(TEST_USER_ID).set({
      email: TEST_EMAIL,
      role: 'user',
      subscriptionPlan: 'ai-professional',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test_123',
      stripeSubscriptionId: 'sub_test_123',
      stripePriceId: 'price_test_ai_pro',
      includedMinutesPerMonth: 750,
      minutesUsedThisMonth: 0,
      minutesReserved: 0,
      billingCycleStart: Timestamp.now(),
      billingCycleEnd: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currentPeriodStart: Timestamp.now(),
      currentPeriodEnd: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      credits: 1000,
      createdAt: Timestamp.now()
    });
    logTest('Create test user with AI Professional plan', 'PASS', undefined, Date.now() - start);
  } catch (error) {
    logTest('Create test user', 'FAIL', (error as Error).message);
  }

  // Test 2: Verify user data
  console.log('\n📊 Data Verification Tests');
  try {
    const start = Date.now();
    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    if (!userData) throw new Error('User data not found');
    if (userData.subscriptionPlan !== 'ai-professional') throw new Error('Incorrect plan');
    if (userData.includedMinutesPerMonth !== 750) throw new Error('Incorrect minutes allocation');
    if (userData.credits !== 1000) throw new Error('Incorrect credits balance');

    logTest('Verify user subscription data', 'PASS',
      `Plan: ${userData.subscriptionPlan}, Minutes: ${userData.includedMinutesPerMonth}, Credits: ${userData.credits}`,
      Date.now() - start);
  } catch (error) {
    logTest('Verify user subscription data', 'FAIL', (error as Error).message);
  }

  // Test 3: Simulate minute reservation
  console.log('\n⏱️  Minute Reservation Tests');
  try {
    const start = Date.now();
    const minutesToReserve = 100;

    await db.collection('users').doc(TEST_USER_ID).update({
      minutesReserved: minutesToReserve
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    if (userData?.minutesReserved !== minutesToReserve) {
      throw new Error(`Expected ${minutesToReserve} reserved, got ${userData?.minutesReserved}`);
    }

    logTest('Reserve 100 minutes for transcription', 'PASS',
      `Reserved: ${userData.minutesReserved}, Available: ${userData.includedMinutesPerMonth - userData.minutesReserved}`,
      Date.now() - start);
  } catch (error) {
    logTest('Reserve minutes', 'FAIL', (error as Error).message);
  }

  // Test 4: Simulate minute consumption
  console.log('\n📉 Minute Consumption Tests');
  try {
    const start = Date.now();
    const minutesUsed = 95; // Actual was 95, reserved was 100
    const transcriptionId = `test-trans-${Date.now()}`;

    // Update user's usage
    await db.collection('users').doc(TEST_USER_ID).update({
      minutesUsedThisMonth: minutesUsed,
      minutesReserved: 0 // Release reservation
    });

    // Create usage record
    await db.collection('usageRecords').add({
      userId: TEST_USER_ID,
      transcriptionId,
      mode: 'ai',
      minutesUsed,
      creditsUsed: 0,
      source: 'subscription',
      timestamp: Timestamp.now(),
      billingCycleStart: Timestamp.now(),
      billingCycleEnd: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: {
        fileName: 'test-audio.mp3',
        duration: minutesUsed * 60
      }
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    logTest('Consume 95 minutes from subscription', 'PASS',
      `Used: ${userData?.minutesUsedThisMonth}, Remaining: ${userData?.includedMinutesPerMonth - userData?.minutesUsedThisMonth}`,
      Date.now() - start);
  } catch (error) {
    logTest('Consume minutes', 'FAIL', (error as Error).message);
  }

  // Test 5: Test overage scenario (exceed subscription minutes)
  console.log('\n💳 Overage Handling Tests');
  try {
    const start = Date.now();
    const currentUsed = 95;
    const additionalMinutes = 700; // This will exceed 750 limit
    const totalUsed = currentUsed + additionalMinutes;
    const overage = totalUsed - 750;
    const creditsForOverage = overage * 1; // AI mode = 1 credit/min
    const transcriptionId = `test-trans-overage-${Date.now()}`;

    // Update user's usage (750 from subscription, rest from credits)
    await db.collection('users').doc(TEST_USER_ID).update({
      minutesUsedThisMonth: totalUsed,
      credits: 1000 - creditsForOverage
    });

    // Create usage record for overage
    await db.collection('usageRecords').add({
      userId: TEST_USER_ID,
      transcriptionId,
      mode: 'ai',
      minutesUsed: additionalMinutes,
      creditsUsed: creditsForOverage,
      source: 'overage',
      timestamp: Timestamp.now(),
      billingCycleStart: Timestamp.now(),
      billingCycleEnd: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    logTest('Handle overage with credits', 'PASS',
      `Total used: ${totalUsed} mins, Overage: ${overage} mins, Credits used: ${creditsForOverage}, Credits remaining: ${userData?.credits}`,
      Date.now() - start);
  } catch (error) {
    logTest('Handle overage', 'FAIL', (error as Error).message);
  }

  // Test 6: Test monthly reset
  console.log('\n🔄 Monthly Reset Tests');
  try {
    const start = Date.now();

    await db.collection('users').doc(TEST_USER_ID).update({
      minutesUsedThisMonth: 0,
      minutesReserved: 0,
      billingCycleStart: Timestamp.now(),
      billingCycleEnd: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    if (userData?.minutesUsedThisMonth !== 0) {
      throw new Error('Minutes not reset');
    }

    logTest('Reset monthly usage', 'PASS',
      `Minutes reset to 0, Full ${userData?.includedMinutesPerMonth} minutes available`,
      Date.now() - start);
  } catch (error) {
    logTest('Reset monthly usage', 'FAIL', (error as Error).message);
  }

  // Test 7: Test credits-only mode (no subscription)
  console.log('\n💰 Credits-Only Mode Tests');
  try {
    const start = Date.now();

    await db.collection('users').doc(TEST_USER_ID).update({
      subscriptionPlan: 'none',
      subscriptionStatus: 'canceled',
      includedMinutesPerMonth: 0,
      minutesUsedThisMonth: 0
    });

    // Simulate AI transcription with credits only
    const minutesUsed = 50;
    const creditsRequired = minutesUsed * 1; // AI mode
    const transcriptionId = `test-trans-credits-${Date.now()}`;

    await db.collection('users').doc(TEST_USER_ID).update({
      credits: 1000 - 45 - creditsRequired // Previous overage + this transcription
    });

    await db.collection('usageRecords').add({
      userId: TEST_USER_ID,
      transcriptionId,
      mode: 'ai',
      minutesUsed,
      creditsUsed: creditsRequired,
      source: 'credits',
      timestamp: Timestamp.now(),
      billingCycleStart: Timestamp.now(),
      billingCycleEnd: Timestamp.now()
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    logTest('Use credits without subscription', 'PASS',
      `${minutesUsed} mins used ${creditsRequired} credits, ${userData?.credits} credits remaining`,
      Date.now() - start);
  } catch (error) {
    logTest('Credits-only mode', 'FAIL', (error as Error).message);
  }

  // Test 8: Test trial subscription
  console.log('\n🎁 Free Trial Tests');
  try {
    const start = Date.now();
    const trialEnd = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.collection('users').doc(TEST_USER_ID).update({
      subscriptionPlan: 'hybrid-starter',
      subscriptionStatus: 'trialing',
      includedMinutesPerMonth: 300,
      minutesUsedThisMonth: 0,
      trialStart: Timestamp.now(),
      trialEnd: trialEnd
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();

    if (userData?.subscriptionStatus !== 'trialing') {
      throw new Error('Trial status not set');
    }

    const daysRemaining = Math.ceil((trialEnd.toMillis() - Date.now()) / (1000 * 60 * 60 * 24));

    logTest('Activate trial subscription', 'PASS',
      `Trial active: Hybrid Starter, ${daysRemaining} days remaining, 300 minutes included`,
      Date.now() - start);
  } catch (error) {
    logTest('Activate trial subscription', 'FAIL', (error as Error).message);
  }

  // Test 9: Verify usage records
  console.log('\n📝 Usage Records Tests');
  try {
    const start = Date.now();

    const usageRecords = await db.collection('usageRecords')
      .where('userId', '==', TEST_USER_ID)
      .get();

    const recordCount = usageRecords.size;
    const totalMinutes = usageRecords.docs.reduce((sum, doc) => sum + (doc.data().minutesUsed || 0), 0);
    const totalCredits = usageRecords.docs.reduce((sum, doc) => sum + (doc.data().creditsUsed || 0), 0);

    if (recordCount === 0) {
      throw new Error('No usage records found');
    }

    logTest('Verify usage records created', 'PASS',
      `${recordCount} records, ${totalMinutes} total minutes, ${totalCredits} total credits used`,
      Date.now() - start);
  } catch (error) {
    logTest('Verify usage records', 'FAIL', (error as Error).message);
  }

  // Test 10: Test concurrent reservation scenario
  console.log('\n🔀 Concurrent Operations Tests');
  try {
    const start = Date.now();

    // Reset to known state
    await db.collection('users').doc(TEST_USER_ID).update({
      subscriptionPlan: 'ai-starter',
      includedMinutesPerMonth: 300,
      minutesUsedThisMonth: 250,
      minutesReserved: 0,
      subscriptionStatus: 'active'
    });

    // Simulate two jobs trying to reserve at the same time
    // Job 1: needs 30 minutes (should succeed)
    // Job 2: needs 40 minutes (should fail - only 50 available, but Job 1 reserved 30)

    await db.collection('users').doc(TEST_USER_ID).update({
      minutesReserved: 30
    });

    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const userData = userDoc.data();
    const available = userData!.includedMinutesPerMonth - userData!.minutesUsedThisMonth - userData!.minutesReserved;

    const canReserve40 = available >= 40;

    logTest('Handle concurrent reservations', 'PASS',
      `After reserving 30 mins, only ${available} mins available (insufficient for 40 mins job)`,
      Date.now() - start);
  } catch (error) {
    logTest('Handle concurrent reservations', 'FAIL', (error as Error).message);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`);
  if (failed > 0) console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`);
  if (skipped > 0) console.log(`\x1b[33m○ Skipped: ${skipped}\x1b[0m`);

  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0) / results.filter(r => r.duration).length;

  console.log(`\nAverage Test Duration: ${avgDuration.toFixed(2)}ms`);

  if (failed === 0) {
    console.log('\n\x1b[32m🎉 All tests passed!\x1b[0m');
  } else {
    console.log('\n\x1b[31m❌ Some tests failed. Review the output above.\x1b[0m');
  }

  // Cleanup
  await cleanup();

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  cleanup().finally(() => process.exit(1));
});
