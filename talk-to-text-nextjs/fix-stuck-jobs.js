#!/usr/bin/env node

/**
 * Fix stuck transcription jobs by manually triggering completion
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const STUCK_JOB_IDS = [
  'g1moqyP6MXY30nS7rsfC', // From the logs
  // Add more job IDs here if needed
];

async function fixStuckJobs() {
  console.log('🔧 Fixing stuck transcription jobs...\n');
  
  for (const jobId of STUCK_JOB_IDS) {
    try {
      console.log(`📋 Checking job ${jobId}...`);
      
      // First, get the current status
      const statusResponse = await axios.get(`${BASE_URL}/api/transcription/poll?jobId=${jobId}`);
      const jobData = statusResponse.data;
      
      console.log(`   Firestore status: ${jobData.firestoreStatus}`);
      console.log(`   Speechmatics status: ${jobData.speechmaticsStatus}`);
      console.log(`   Has transcript: ${!!jobData.transcript}`);
      console.log(`   Speechmatics ID: ${JSON.stringify(jobData.speechmaticsJobId)}`);
      
      // If Speechmatics is done but Firestore is still processing, trigger completion
      if (jobData.speechmaticsStatus === 'done' && 
          jobData.firestoreStatus === 'processing' && 
          !jobData.transcript) {
        
        console.log(`   🚀 Triggering completion for job ${jobId}...`);
        
        // Extract speechmatics job ID
        const speechmaticsJobId = typeof jobData.speechmaticsJobId === 'string' 
          ? jobData.speechmaticsJobId 
          : jobData.speechmaticsJobId?.job_id;
          
        if (speechmaticsJobId) {
          const completionResponse = await axios.post(`${BASE_URL}/api/transcription/poll`, {
            jobId,
            speechmaticsJobId
          });
          
          if (completionResponse.data?.status === 'completed') {
            console.log(`   ✅ Job ${jobId} fixed successfully!`);
          } else {
            console.log(`   ⚠️ Job ${jobId} completion response:`, completionResponse.data);
          }
        } else {
          console.log(`   ❌ No valid speechmatics job ID found for ${jobId}`);
        }
      } else if (jobData.firestoreStatus === 'completed') {
        console.log(`   ✅ Job ${jobId} is already completed`);
      } else {
        console.log(`   ⏳ Job ${jobId} is not ready for completion (speechmatics: ${jobData.speechmaticsStatus}, firestore: ${jobData.firestoreStatus})`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`❌ Error fixing job ${jobId}:`, error.response?.data || error.message);
      console.log('');
    }
  }
  
  console.log('🎯 Fix attempt completed. Check the UI to see if jobs are now completed.');
}

fixStuckJobs().catch(console.error);