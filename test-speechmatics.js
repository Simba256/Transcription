#!/usr/bin/env node

/**
 * Standalone Speechmatics webhook test script
 * This script tests the complete workflow:
 * 1. Submit job to Speechmatics with webhook
 * 2. Monitor webhook callbacks
 * 3. Fetch transcript when complete
 */

const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local file
function loadEnvVars() {
  const envPath = path.join(__dirname, '.env.local');
  const envVars = {};

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    });
  }

  return envVars;
}

const envVars = loadEnvVars();

// Configuration from environment
const SPEECHMATICS_API_KEY = envVars.SPEECHMATICS_API_KEY;
const SPEECHMATICS_API_URL = envVars.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';
const WEBHOOK_TOKEN = envVars.SPEECHMATICS_WEBHOOK_TOKEN || 'speechmatics_webhook_secret_2024';
const APP_URL = 'https://0a28bbb7e382.ngrok-free.app';

console.log('🧪 Speechmatics Webhook Test Script');
console.log('=====================================');
console.log(`API URL: ${SPEECHMATICS_API_URL}`);
console.log(`API Key present: ${!!SPEECHMATICS_API_KEY}`);
console.log(`Webhook URL: ${APP_URL}/api/speechmatics/callback?token=${WEBHOOK_TOKEN}&jobId=TEST_JOB`);
console.log('');

// Check if we have required configuration
if (!SPEECHMATICS_API_KEY) {
  console.error('❌ Error: SPEECHMATICS_API_KEY not found in .env.local');
  process.exit(1);
}

// Use the real harvard.wav file for testing
const testAudioPath = '/media/basim/New Volume1/Basim/Saad Bhai/Chamelion Ideas/Transcription/Audio/harvard.wav';
if (!fs.existsSync(testAudioPath)) {
  console.error('❌ Error: harvard.wav file not found at expected path');
  console.log('Expected:', testAudioPath);
  process.exit(1);
}

const audioStats = fs.statSync(testAudioPath);
console.log(`📁 Using real audio file: harvard.wav (${Math.round(audioStats.size / 1024)}KB)`);

class SpeechmaticsTest {
  constructor() {
    this.jobId = null;
    this.testJobId = `TEST_${Date.now()}`;
    this.startTime = Date.now();
  }

  async submitJob() {
    try {
      console.log('🚀 Step 1: Submitting job to Speechmatics...');

      const audioBuffer = fs.readFileSync(testAudioPath);
      const callbackUrl = `${APP_URL.replace(/\/$/, '')}/api/speechmatics/callback?token=${WEBHOOK_TOKEN}&jobId=${this.testJobId}`;

      // Create job configuration
      const jobConfig = {
        type: 'transcription',
        transcription_config: {
          language: 'en',
          operating_point: 'enhanced'
        },
        notification_config: [{
          url: callbackUrl,
          contents: ['transcript'],
          auth_headers: []
        }]
      };

      console.log(`📋 Job config:`, JSON.stringify(jobConfig, null, 2));
      console.log(`🔗 Webhook callback URL: ${callbackUrl}`);

      // Create multipart form data
      const boundary = `----speechmatics${Date.now()}`;
      const configJson = JSON.stringify(jobConfig);

      const formParts = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="config"',
        'Content-Type: application/json',
        '',
        configJson,
        `--${boundary}`,
        `Content-Disposition: form-data; name="data_file"; filename="harvard.wav"`,
        'Content-Type: audio/wav',
        '',
      ];

      const formHeader = Buffer.from(formParts.join('\r\n') + '\r\n', 'utf8');
      const formFooter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const formData = Buffer.concat([formHeader, audioBuffer, formFooter]);

      const response = await fetch(`${SPEECHMATICS_API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formData.length.toString()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      this.jobId = responseData.id;

      console.log(`✅ Job submitted successfully!`);
      console.log(`📝 Speechmatics Job ID: ${this.jobId}`);
      console.log(`🕒 Submitted at: ${new Date().toISOString()}`);

      return true;

    } catch (error) {
      console.error('❌ Error submitting job:', error.message);
      return false;
    }
  }

  async checkJobStatus() {
    if (!this.jobId) return null;

    try {
      const response = await fetch(`${SPEECHMATICS_API_URL}/jobs/${this.jobId}`, {
        headers: {
          'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.job?.status || 'unknown';
    } catch (error) {
      console.error('❌ Error checking job status:', error.message);
      return 'error';
    }
  }

  async fetchTranscript() {
    if (!this.jobId) return null;

    try {
      console.log('📄 Fetching transcript...');
      const response = await fetch(`${SPEECHMATICS_API_URL}/jobs/${this.jobId}/transcript?format=json-v2`, {
        headers: {
          'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const transcriptData = await response.json();
      console.log('✅ Transcript retrieved successfully!');
      console.log('📄 Transcript data keys:', Object.keys(transcriptData));

      if (transcriptData.results && transcriptData.results.length > 0) {
        const plainText = transcriptData.results
          .map(result => result.alternatives?.[0]?.content || '')
          .join(' ');
        console.log('📝 Plain text transcript:', plainText || '(silent audio file)');
      }

      return transcriptData;
    } catch (error) {
      console.error('❌ Error fetching transcript:', error.message);
      return null;
    }
  }

  async testWebhookEndpoint() {
    try {
      console.log('🌐 Step 2: Testing webhook endpoint...');
      const webhookUrl = `${APP_URL.replace(/\/$/, '')}/api/speechmatics/callback?token=${WEBHOOK_TOKEN}&jobId=${this.testJobId}`;

      console.log(`📡 Testing webhook endpoint: ${webhookUrl}`);

      const response = await fetch(webhookUrl, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Webhook endpoint is accessible');
        console.log('📋 Response:', data);
        return true;
      } else {
        console.log(`⚠️  Webhook endpoint returned status ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error testing webhook endpoint:', error.message);
      console.log('💡 This might be normal if running locally without ngrok/public URL');
      return false;
    }
  }

  async monitorJobComplete() {
    console.log('👀 Step 3: Monitoring job completion...');

    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkJobStatus();
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      console.log(`🕒 [${elapsed}s] Job status: ${status}`);

      if (status === 'done') {
        console.log('🎉 Job completed successfully!');
        const transcript = await this.fetchTranscript();
        return transcript;
      } else if (status === 'rejected') {
        console.log('❌ Job was rejected by Speechmatics');
        return null;
      } else if (status === 'error') {
        console.log('❌ Error occurred while checking job status');
        return null;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    console.log('⏰ Timeout: Job did not complete within 5 minutes');
    return null;
  }

  async cleanup() {
    if (this.jobId) {
      try {
        console.log('🧹 Cleaning up job...');
        const response = await fetch(`${SPEECHMATICS_API_URL}/jobs/${this.jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`
          }
        });

        if (response.ok) {
          console.log('✅ Job cleaned up successfully');
        } else {
          console.log(`⚠️  Failed to cleanup job: ${response.status}`);
        }
      } catch (error) {
        console.log('⚠️  Error during cleanup:', error.message);
      }
    }
  }

  async runTest() {
    console.log('🏁 Starting Speechmatics webhook test...\n');

    try {
      // Test webhook endpoint first
      await this.testWebhookEndpoint();
      console.log('');

      // Submit job
      const submitted = await this.submitJob();
      if (!submitted) {
        console.log('❌ Test failed: Could not submit job');
        return;
      }

      console.log('');

      // Monitor completion
      const result = await this.monitorJobComplete();

      console.log('\n📊 Test Summary:');
      console.log('=================');
      console.log(`⏱️  Total time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
      console.log(`🆔 Speechmatics Job ID: ${this.jobId}`);
      console.log(`✅ Result: ${result ? 'SUCCESS' : 'FAILED/TIMEOUT'}`);

      if (result) {
        console.log('🎯 The webhook workflow is working correctly!');
        console.log('💡 If your app is still not receiving transcripts, check:');
        console.log('   - Database updates in webhook handler');
        console.log('   - Frontend polling mechanism');
        console.log('   - Job ID matching between systems');
      } else {
        console.log('❌ The webhook workflow has issues');
        console.log('💡 Possible causes:');
        console.log('   - Webhook URL not accessible (need ngrok for localhost)');
        console.log('   - Speechmatics API configuration issue');
        console.log('   - Network connectivity problems');
      }

    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  const test = new SpeechmaticsTest();
  await test.runTest();
}

main().catch(console.error);