'use client';

import { useState, useEffect, useCallback } from 'react';
import { secureApiClient } from '@/lib/secure-api-client';

interface TranscriptionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  speechmaticsJobId?: string;
  fileName?: string;
  transcript?: string;
  error?: string;
}

interface UseTranscriptionPollingOptions {
  pollInterval?: number; // ms between polls
  maxPolls?: number; // max number of poll attempts
  autoStart?: boolean;
}

export function useTranscriptionPolling(
  jobIds: string[] = [],
  options: UseTranscriptionPollingOptions = {}
) {
  const {
    pollInterval = 10000, // 10 seconds
    maxPolls = 120, // 20 minutes max (120 * 10s)
    autoStart = true
  } = options;

  const [jobs, setJobs] = useState<Record<string, TranscriptionJob>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll a single job
  const pollJob = useCallback(async (jobId: string) => {
    console.log(`🔍 Polling job ${jobId}...`);
    try {
      const response = await secureApiClient.get(`/api/transcription/poll?jobId=${jobId}`);
      
      if (response.data) {
        const responseData = response.data;
        
        // Debug: Log all response data
        console.log(`🔍 Polling response for job ${jobId}:`, {
          speechmaticsStatus: responseData.speechmaticsStatus,
          firestoreStatus: responseData.firestoreStatus,
          hasTranscript: !!responseData.transcript,
          speechmaticsJobId: responseData.speechmaticsJobId
        });
        
        // Only trigger completion if Speechmatics is done AND we have a valid speechmatics job ID
        const speechmaticsJobId = typeof responseData.speechmaticsJobId === 'string' 
          ? responseData.speechmaticsJobId 
          : responseData.speechmaticsJobId?.job_id;

        const shouldComplete = responseData.speechmaticsStatus === 'done' && 
                              responseData.firestoreStatus === 'processing' && 
                              speechmaticsJobId;
                              
        console.log(`🎯 Should complete job ${jobId}? ${shouldComplete} (speechmatics: ${responseData.speechmaticsStatus}, firestore: ${responseData.firestoreStatus}, has speechmaticsJobId: ${!!speechmaticsJobId})`);
        
        if (shouldComplete) {
          console.log(`✅ Job ${jobId} is done in Speechmatics but not updated in Firestore. Triggering completion...`);
          
          try {
            // Trigger the POST endpoint to complete the job
            const completionResponse = await secureApiClient.post('/api/transcription/poll', {
              jobId,
              speechmaticsJobId
            });
            
            if (completionResponse.data?.status === 'completed') {
              console.log(`✅ Job ${jobId} successfully completed through polling!`);
              const jobData: TranscriptionJob = {
                id: jobId,
                status: 'completed',
                speechmaticsJobId,
                transcript: completionResponse.data.transcript,
                error: null
              };

              setJobs(prev => ({
                ...prev,
                [jobId]: jobData
              }));

              return jobData;
            }
          } catch (completionError) {
            console.error(`❌ Failed to complete job ${jobId} through polling:`, completionError);
            // Don't mark as error, let normal polling continue
          }
        }
        
        // Determine the most appropriate status to show
        let displayStatus: 'pending' | 'processing' | 'completed' | 'error' = 'pending';
        
        if (responseData.firestoreStatus === 'completed') {
          displayStatus = 'completed';
        } else if (responseData.firestoreStatus === 'error') {
          displayStatus = 'error';
        } else if (responseData.firestoreStatus === 'processing' || responseData.speechmaticsStatus === 'running') {
          displayStatus = 'processing';
        } else if (responseData.speechmaticsJobId && !responseData.error) {
          // Job exists in Speechmatics but not yet processing - show as processing
          displayStatus = 'processing';
        }

        const jobData: TranscriptionJob = {
          id: jobId,
          status: displayStatus,
          speechmaticsJobId: responseData.speechmaticsJobId,
          transcript: responseData.transcript,
          error: responseData.error
        };

        setJobs(prev => ({
          ...prev,
          [jobId]: jobData
        }));

        return jobData;
      }
    } catch (error: any) {
      console.error(`Polling error for job ${jobId}:`, error);
      
      // Don't immediately mark as error - it could be a temporary network issue
      // Only mark as error if it's a permanent failure (401, 404, etc.)
      const isPermamentError = error.response?.status === 404 || 
                               error.response?.status === 401 || 
                               error.response?.status === 403;
      
      if (isPermamentError) {
        const jobData: TranscriptionJob = {
          id: jobId,
          status: 'error',
          error: error.response?.data?.error || error.message || 'Job not found'
        };

        setJobs(prev => ({
          ...prev,
          [jobId]: jobData
        }));

        return jobData;
      } else {
        // For temporary errors, keep the job in its current state
        console.warn(`Temporary polling error for job ${jobId}, will retry:`, error.message);
        return jobs[jobId] || { id: jobId, status: 'processing', error: null };
      }
    }
  }, []);

  // Trigger polling for jobs with speechmatics IDs
  const triggerJobPolling = useCallback(async (jobId: string, speechmaticsJobId: string) => {
    try {
      console.log(`Triggering polling for job ${jobId} with speechmatics ID ${speechmaticsJobId}`);
      
      const response = await secureApiClient.post('/api/transcription/poll', {
        jobId,
        speechmaticsJobId
      });

      if (response.data) {
        const jobData: TranscriptionJob = {
          id: jobId,
          status: response.data.status === 'completed' ? 'completed' : 'processing',
          speechmaticsJobId,
          transcript: response.data.transcript,
          error: response.data.error
        };

        setJobs(prev => ({
          ...prev,
          [jobId]: jobData
        }));

        return jobData;
      }
    } catch (error: any) {
      console.error(`Manual polling error for job ${jobId}:`, error);
      setError(error.response?.data?.error || error.message);
    }
  }, []);

  // Start polling for specific jobs
  const startPolling = useCallback(async (targetJobIds?: string[]) => {
    const jobsToCheck = targetJobIds || jobIds;
    
    if (jobsToCheck.length === 0) {
      console.log('No jobs to poll');
      return;
    }

    setIsPolling(true);
    setError(null);
    
    console.log(`Starting polling for ${jobsToCheck.length} jobs`);

    let pollCount = 0;
    
    const pollCycle = async () => {
      if (pollCount >= maxPolls) {
        console.log('Max polls reached, stopping');
        setIsPolling(false);
        return;
      }

      const pendingJobs: string[] = [];
      
      // Check which jobs still need polling
      for (const jobId of jobsToCheck) {
        const currentJob = jobs[jobId];
        if (!currentJob || (currentJob.status !== 'completed' && currentJob.status !== 'error')) {
          pendingJobs.push(jobId);
        }
      }

      if (pendingJobs.length === 0) {
        console.log('All jobs completed, stopping polling');
        setIsPolling(false);
        return;
      }

      // Poll all pending jobs
      const pollPromises = pendingJobs.map(jobId => pollJob(jobId));
      await Promise.all(pollPromises);

      pollCount++;
      
      // Schedule next poll
      setTimeout(pollCycle, pollInterval);
    };

    // Start first poll immediately
    await pollCycle();
  }, [jobIds, jobs, maxPolls, pollInterval, pollJob]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Auto-start polling when jobIds change
  useEffect(() => {
    console.log('🔄 useTranscriptionPolling: jobIds changed', { 
      jobIds, 
      autoStart, 
      jobCount: jobIds.length,
      currentlyPolling: isPolling 
    });
    
    if (autoStart && jobIds.length > 0) {
      console.log('🚀 Starting polling for jobs:', jobIds);
      startPolling();
    } else if (jobIds.length === 0 && isPolling) {
      console.log('⏹️ No jobs to poll, stopping polling');
      setIsPolling(false);
    }
  }, [jobIds, autoStart, startPolling]);

  // Get jobs that are still processing
  const processingJobs = Object.values(jobs).filter(
    job => job.status === 'pending' || job.status === 'processing'
  );

  // Get completed jobs
  const completedJobs = Object.values(jobs).filter(
    job => job.status === 'completed'
  );

  // Get failed jobs
  const failedJobs = Object.values(jobs).filter(
    job => job.status === 'error'
  );

  return {
    jobs,
    isPolling,
    error,
    processingJobs,
    completedJobs,
    failedJobs,
    startPolling,
    stopPolling,
    triggerJobPolling,
    pollJob
  };
}