/**
 * Test Runner - Runs all tests sequentially
 * Lightweight test runner without external dependencies
 */

const { spawn } = require('child_process');
const path = require('path');

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${testFile}...\n`);

    const testProcess = spawn('node', [path.join(__dirname, testFile)], {
      stdio: 'inherit'
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testFile} completed successfully\n`);
        resolve();
      } else {
        console.log(`\n❌ ${testFile} failed with code ${code}\n`);
        reject(new Error(`Test ${testFile} failed`));
      }
    });

    testProcess.on('error', (error) => {
      console.error(`\n❌ Error running ${testFile}:`, error.message);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🧪 Starting Test Suite for Firebase Auth App\n');
  console.log('📊 Testing security improvements, validation, and API endpoints...\n');

  const tests = [
    'api-test.js',
    'security.test.js',
    'rate-limit.test.js'
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      await runTest(test);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`Test ${test} failed:`, error.message);
    }
  }

  console.log('\n📈 Test Results Summary:');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Application is ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues before production deployment.');
    process.exit(1);
  }
}

// Check if server is running before starting tests
console.log('🔍 Checking if development server is running on port 3000...');

const http = require('http');
const testReq = http.get('http://localhost:3000/api/test-config', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Development server is running\n');
    runAllTests().catch(console.error);
  } else {
    console.error('❌ Development server returned unexpected status:', res.statusCode);
    process.exit(1);
  }
});

testReq.on('error', (error) => {
  console.error('❌ Cannot connect to development server. Please ensure the app is running on port 3000.');
  console.error('   Run: npm run dev');
  process.exit(1);
});

testReq.setTimeout(5000, () => {
  console.error('❌ Timeout connecting to development server.');
  process.exit(1);
});