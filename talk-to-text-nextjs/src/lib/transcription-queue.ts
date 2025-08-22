import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { speechmaticsService } from './speechmatics';

export interface TranscriptionJobData {
  id?: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  priority: 'low' | 'normal' | 'high';
  speechmaticsJobId?: string;
  speechmaticsStatus?: string;
  transcript?: string;
  fullTranscript?: any;
  duration?: number;
  error?: string;
  createdAt: Timestamp;
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
  errorAt?: Timestamp;
  lastCheckedAt?: Timestamp;
  retryCount: number;
  maxRetries: number;
  language: string;
  diarization: boolean;
  tags?: string[];
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  error: number;
  total: number;
}

class TranscriptionQueue {
  private activePollers = new Set<string>();

  /**
   * Safely update Firestore document with validated fields
   */
  private async safeUpdateDoc(docRef: any, updates: Record<string, any>): Promise<void> {
    // Remove undefined values to prevent Firestore errors
    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    if (Object.keys(cleanUpdates).length > 0) {
      await updateDoc(docRef, cleanUpdates);
    }
  }

  /**
   * Add a new transcription job to the queue
   */
  async addJob(jobData: Omit<TranscriptionJobData, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    try {
      const job: Omit<TranscriptionJobData, 'id'> = {
        ...jobData,
        createdAt: serverTimestamp() as Timestamp,
        retryCount: 0,
        maxRetries: jobData.maxRetries || 3
      };

      const docRef = await addDoc(collection(db, 'transcriptions'), job);
      
      // Don't auto-start processing - caller should use processJobWithFile with the actual file
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding transcription job:', error);
      throw new Error('Failed to add transcription job to queue');
    }
  }

  /**
   * Process a transcription job with file object
   */
  async processJobWithFile(jobId: string, audioFile: File): Promise<void> {
    try {
      // Prevent duplicate processing
      if (this.activePollers.has(jobId)) {
        return;
      }

      const jobDoc = doc(db, 'transcriptions', jobId);
      
      // Update status to processing
      await updateDoc(jobDoc, {
        status: 'processing',
        submittedAt: serverTimestamp()
      });

      // Get job data
      const jobSnapshot = await getDocs(query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      ));

      if (jobSnapshot.empty) {
        throw new Error('Job not found');
      }

      const jobData = jobSnapshot.docs[0].data() as TranscriptionJobData;

      // Submit to Speechmatics using the new client-side method
      const speechmaticsJobId = await speechmaticsService.processTranscription(
        audioFile,
        jobData.fileName,
        jobId,
        {
          transcription_config: {
            language: jobData.language || 'en',
            diarization: jobData.diarization ? 'speaker' : undefined
          }
        }
      );

      // Start polling for completion
      this.startPolling(jobId, speechmaticsJobId);
      
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      // Update job with error status
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown processing error',
        errorAt: serverTimestamp()
      });
    }
  }

  /**
   * Process a transcription job (legacy method for backward compatibility)
   */
  async processJob(jobId: string): Promise<void> {
    try {
      // This method is now used for polling existing jobs
      // For new jobs, use processJobWithFile instead
      const jobDoc = doc(db, 'transcriptions', jobId);
      
      // Get job data
      const jobSnapshot = await getDocs(query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      ));

      if (jobSnapshot.empty) {
        throw new Error('Job not found');
      }

      const jobData = jobSnapshot.docs[0].data() as TranscriptionJobData;

      // If job has a speechmatics job ID, start polling
      if (jobData.speechmaticsJobId) {
        this.startPolling(jobId, jobData.speechmaticsJobId);
      } else {
        throw new Error('Job cannot be processed without file object. Use processJobWithFile instead.');
      }
      
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      // Update job with error status
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown processing error',
        errorAt: serverTimestamp()
      });
    }
  }

  /**
   * Start polling a Speechmatics job for completion
   */
  private async startPolling(jobId: string, speechmaticsJobId: string): Promise<void> {
    this.activePollers.add(jobId);
    
    try {
      await speechmaticsService.pollJobStatus(speechmaticsJobId, jobId);
    } catch (error) {
      console.error(`Polling failed for job ${jobId}:`, error);
    } finally {
      this.activePollers.delete(jobId);
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      const jobDoc = doc(db, 'transcriptions', jobId);
      const jobSnapshot = await getDocs(query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      ));

      if (jobSnapshot.empty) {
        throw new Error('Job not found');
      }

      const jobData = jobSnapshot.docs[0].data() as TranscriptionJobData;

      if (jobData.retryCount >= jobData.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
      }

      // Update retry count and reset status
      await updateDoc(jobDoc, {
        status: 'pending',
        retryCount: (jobData.retryCount || 0) + 1,
        error: null,
        errorAt: null
      });

      // If job has a speechmatics job ID, check its current status first
      if (jobData.speechmaticsJobId) {
        try {
          await this.checkAndUpdateJobStatus(jobId, jobData.speechmaticsJobId);
          // If job is actually complete, no need to retry
          const updatedJob = await getDocs(query(
            collection(db, 'transcriptions'),
            where('__name__', '==', jobId)
          ));
          const updatedJobData = updatedJob.docs[0].data() as TranscriptionJobData;
          if (updatedJobData.status === 'completed') {
            return;
          }
        } catch (error) {
          console.warn(`Failed to check job status before retry: ${error}`);
        }
        
        // Start polling the existing job
        await this.processJob(jobId);
      } else {
        // Job was never submitted to Speechmatics, need file re-upload
        // Mark it as pending and let the user know they need to re-upload
        await updateDoc(jobDoc, {
          status: 'error',
          error: 'This transcription needs to be re-submitted with the original file. Please upload the file again.',
          errorAt: serverTimestamp()
        });
        throw new Error('This transcription was never properly submitted. Please re-upload the file to retry.');
      }
      
    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Check and update job status from Speechmatics
   */
  private async checkAndUpdateJobStatus(jobId: string, speechmaticsJobId: string): Promise<void> {
    try {
      const job = await speechmaticsService.getJobStatusDirect(speechmaticsJobId);
      
      // Validate job status before updating Firestore
      if (!job || !job.status) {
        console.warn(`Invalid job status received for ${speechmaticsJobId}:`, job);
        throw new Error('Invalid job status received from Speechmatics');
      }
      
      // Update Firestore with current status using safe update
      await this.safeUpdateDoc(doc(db, 'transcriptions', jobId), {
        speechmaticsStatus: job.status,
        lastCheckedAt: serverTimestamp()
      });

      if (job.status === 'done') {
        // Get the transcript
        const transcript = await speechmaticsService.getTranscriptDirect(speechmaticsJobId, 'json-v2');
        const transcriptText = speechmaticsService.extractTextFromTranscript(transcript);
        
        // Update Firestore with completed transcript
        await updateDoc(doc(db, 'transcriptions', jobId), {
          status: 'completed',
          transcript: transcriptText,
          fullTranscript: transcript,
          completedAt: serverTimestamp(),
          duration: job.duration
        });
      } else if (job.status === 'rejected') {
        await updateDoc(doc(db, 'transcriptions', jobId), {
          status: 'error',
          error: 'Job rejected by Speechmatics',
          errorAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Failed to check job status for ${speechmaticsJobId}:`, error);
      throw error;
    }
  }

  /**
   * Reset retry count for a job (allows retrying jobs that exceeded max retries)
   */
  async resetRetryCount(jobId: string): Promise<void> {
    try {
      const jobDoc = doc(db, 'transcriptions', jobId);
      await updateDoc(jobDoc, {
        retryCount: 0,
        error: null,
        errorAt: null
      });
    } catch (error) {
      console.error(`Error resetting retry count for job ${jobId}:`, error);
      throw new Error('Failed to reset retry count');
    }
  }

  /**
   * Refresh job status from Speechmatics (useful for stuck jobs)
   */
  async refreshJobStatus(jobId: string): Promise<void> {
    try {
      const jobSnapshot = await getDocs(query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      ));

      if (jobSnapshot.empty) {
        throw new Error('Job not found');
      }

      const jobData = jobSnapshot.docs[0].data() as TranscriptionJobData;

      if (jobData.speechmaticsJobId) {
        await this.checkAndUpdateJobStatus(jobId, jobData.speechmaticsJobId);
      } else {
        // Job never made it to Speechmatics, mark it as needing re-submission
        await updateDoc(doc(db, 'transcriptions', jobId), {
          status: 'pending',
          error: 'Job needs to be re-submitted to Speechmatics',
          lastCheckedAt: serverTimestamp()
        });
        throw new Error('Job was never submitted to Speechmatics. Please retry the transcription.');
      }
    } catch (error) {
      console.error(`Error refreshing job status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Force complete a job with manual transcript (emergency method)
   */
  async forceCompleteJob(jobId: string, transcript: string): Promise<void> {
    try {
      const jobDoc = doc(db, 'transcriptions', jobId);
      await updateDoc(jobDoc, {
        status: 'completed',
        transcript: transcript,
        completedAt: serverTimestamp(),
        error: null,
        errorAt: null
      });
    } catch (error) {
      console.error(`Error force completing job ${jobId}:`, error);
      throw new Error('Failed to force complete job');
    }
  }

  /**
   * Check if a job can be retried or needs re-submission
   */
  async getJobRetryInfo(jobId: string): Promise<{
    canRetry: boolean;
    needsResubmission: boolean;
    reason: string;
  }> {
    try {
      const jobSnapshot = await getDocs(query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      ));

      if (jobSnapshot.empty) {
        return {
          canRetry: false,
          needsResubmission: false,
          reason: 'Job not found'
        };
      }

      const jobData = jobSnapshot.docs[0].data() as TranscriptionJobData;

      if (jobData.status === 'completed') {
        return {
          canRetry: false,
          needsResubmission: false,
          reason: 'Job already completed'
        };
      }

      if (jobData.retryCount >= jobData.maxRetries && !jobData.speechmaticsJobId) {
        return {
          canRetry: false,
          needsResubmission: true,
          reason: 'Job never submitted to Speechmatics and exceeded retries'
        };
      }

      if (!jobData.speechmaticsJobId) {
        return {
          canRetry: false,
          needsResubmission: true,
          reason: 'Job was never submitted to Speechmatics'
        };
      }

      return {
        canRetry: true,
        needsResubmission: false,
        reason: 'Job can be retried'
      };
    } catch (error) {
      return {
        canRetry: false,
        needsResubmission: false,
        reason: 'Error checking job status'
      };
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      const jobDoc = doc(db, 'transcriptions', jobId);
      const jobSnapshot = await getDocs(query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      ));

      if (jobSnapshot.empty) {
        throw new Error('Job not found');
      }

      const jobData = jobSnapshot.docs[0].data() as TranscriptionJobData;

      // Cancel Speechmatics job if it exists
      if (jobData.speechmaticsJobId) {
        try {
          await speechmaticsService.deleteJob(jobData.speechmaticsJobId);
        } catch (error) {
          console.warn('Failed to cancel Speechmatics job:', error);
        }
      }

      // Stop polling
      this.activePollers.delete(jobId);

      // Delete the job from Firestore
      await deleteDoc(jobDoc);
      
    } catch (error) {
      console.error(`Error canceling job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get jobs for a specific user
   */
  async getUserJobs(
    userId: string, 
    status?: TranscriptionJobData['status'],
    limitCount: number = 50
  ): Promise<TranscriptionJobData[]> {
    try {
      let q = query(
        collection(db, 'transcriptions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (status) {
        q = query(
          collection(db, 'transcriptions'),
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TranscriptionJobData));
      
    } catch (error) {
      console.error('Error getting user jobs:', error);
      throw new Error('Failed to retrieve transcription jobs');
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [pendingSnap, processingSnap, completedSnap, errorSnap] = await Promise.all([
        getDocs(query(collection(db, 'transcriptions'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'transcriptions'), where('status', '==', 'processing'))),
        getDocs(query(collection(db, 'transcriptions'), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'transcriptions'), where('status', '==', 'error')))
      ]);

      const stats: QueueStats = {
        pending: pendingSnap.size,
        processing: processingSnap.size,
        completed: completedSnap.size,
        error: errorSnap.size,
        total: 0
      };

      stats.total = stats.pending + stats.processing + stats.completed + stats.error;
      
      return stats;
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw new Error('Failed to retrieve queue statistics');
    }
  }

  /**
   * Subscribe to real-time updates for a user's jobs
   */
  subscribeToUserJobs(
    userId: string,
    callback: (jobs: TranscriptionJobData[]) => void,
    status?: TranscriptionJobData['status']
  ): () => void {
    let q = query(
      collection(db, 'transcriptions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (status) {
      q = query(
        collection(db, 'transcriptions'),
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TranscriptionJobData));
      
      callback(jobs);
    }, (error) => {
      console.error('Error in job subscription:', error);
    });
  }

  /**
   * Process pending jobs (for background processing)
   */
  async processPendingJobs(batchSize: number = 5): Promise<void> {
    try {
      const pendingJobs = await getDocs(query(
        collection(db, 'transcriptions'),
        where('status', '==', 'pending'),
        orderBy('priority', 'desc'),
        orderBy('createdAt', 'asc'),
        limit(batchSize)
      ));

      const processingPromises = pendingJobs.docs.map(doc => 
        this.processJob(doc.id)
      );

      await Promise.allSettled(processingPromises);
      
    } catch (error) {
      console.error('Error processing pending jobs:', error);
    }
  }

  /**
   * Clean up old completed jobs (for maintenance)
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const oldJobs = await getDocs(query(
        collection(db, 'transcriptions'),
        where('status', 'in', ['completed', 'error']),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate))
      ));

      const deletePromises = oldJobs.docs.map(doc => deleteDoc(doc.ref));
      await Promise.allSettled(deletePromises);
      
      return oldJobs.size;
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const transcriptionQueue = new TranscriptionQueue();
export default transcriptionQueue;