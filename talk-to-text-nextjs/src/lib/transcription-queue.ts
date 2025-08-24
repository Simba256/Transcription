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

export interface SimplifiedTranscriptionJobData {
  id?: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'queued_for_admin' | 'admin_review';
  priority: 'low' | 'normal' | 'high';
  mode: 'ai' | 'human' | 'hybrid';
  openaiJobId?: string;
  aiTranscript?: string;
  processingTime?: number;
  wordCount?: number;
  confidence?: number;
  adminData?: {
    adminTranscript?: string;
    adminNotes?: string;
    reviewedBy?: string;
    reviewedAt?: Timestamp;
  };
  finalTranscript?: string;
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
  queuedForAdmin: number;
  total: number;
}

class SimplifiedTranscriptionQueue {
  
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
  async addJob(jobData: Omit<SimplifiedTranscriptionJobData, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    try {
      const job: Omit<SimplifiedTranscriptionJobData, 'id'> = {
        ...jobData,
        createdAt: serverTimestamp() as Timestamp,
        retryCount: 0,
        maxRetries: jobData.maxRetries || 3
      };

      const docRef = await addDoc(collection(db, 'transcriptions'), job);
      
      console.log(`📥 Added job ${docRef.id} to simplified queue (mode: ${job.mode})`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding transcription job:', error);
      throw new Error('Failed to add transcription job to queue');
    }
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: SimplifiedTranscriptionJobData['status']): Promise<SimplifiedTranscriptionJobData[]> {
    try {
      const jobsQuery = query(
        collection(db, 'transcriptions'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(jobsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimplifiedTranscriptionJobData[];

    } catch (error) {
      console.error(`Error fetching jobs with status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get admin queue (jobs waiting for manual transcription)
   */
  async getAdminQueue(): Promise<SimplifiedTranscriptionJobData[]> {
    return this.getJobsByStatus('queued_for_admin');
  }

  /**
   * Get jobs for a specific user
   */
  async getUserJobs(userId: string, status?: SimplifiedTranscriptionJobData['status']): Promise<SimplifiedTranscriptionJobData[]> {
    try {
      let jobsQuery;
      
      if (status) {
        jobsQuery = query(
          collection(db, 'transcriptions'),
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      } else {
        jobsQuery = query(
          collection(db, 'transcriptions'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(jobsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimplifiedTranscriptionJobData[];

    } catch (error) {
      console.error(`Error fetching jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for user's jobs
   */
  subscribeToUserJobs(
    userId: string,
    callback: (jobs: SimplifiedTranscriptionJobData[]) => void,
    status?: SimplifiedTranscriptionJobData['status']
  ): () => void {
    try {
      let jobsQuery;
      
      if (status) {
        jobsQuery = query(
          collection(db, 'transcriptions'),
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      } else {
        jobsQuery = query(
          collection(db, 'transcriptions'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      }
      
      const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
        const jobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SimplifiedTranscriptionJobData[];
        callback(jobs);
      });
      
      return unsubscribe;

    } catch (error) {
      console.error(`Error subscribing to jobs for user ${userId}:`, error);
      // Return a no-op unsubscribe function
      return () => {};
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId: string, status: SimplifiedTranscriptionJobData['status'], additionalFields?: Record<string, any>): Promise<void> {
    try {
      const updates: Record<string, any> = {
        status,
        lastCheckedAt: serverTimestamp(),
        ...additionalFields
      };

      if (status === 'completed') {
        updates.completedAt = serverTimestamp();
      } else if (status === 'error') {
        updates.errorAt = serverTimestamp();
      }

      await this.safeUpdateDoc(doc(db, 'transcriptions', jobId), updates);
      console.log(`📊 Updated job ${jobId} status to: ${status}`);

    } catch (error) {
      console.error(`Error updating job ${jobId} status:`, error);
      throw error;
    }
  }

  /**
   * Complete job with admin transcription
   */
  async completeAdminTranscription(
    jobId: string, 
    transcription: string, 
    adminNotes?: string, 
    reviewedBy?: string
  ): Promise<void> {
    try {
      const adminData = {
        adminTranscript: transcription,
        adminNotes,
        reviewedBy,
        reviewedAt: serverTimestamp()
      };

      await this.updateJobStatus(jobId, 'completed', {
        adminData,
        finalTranscript: transcription
      });

      console.log(`✅ Admin completed transcription for job ${jobId}`);

    } catch (error) {
      console.error(`Error completing admin transcription for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<SimplifiedTranscriptionJobData | null> {
    try {
      const jobQuery = query(
        collection(db, 'transcriptions'),
        where('__name__', '==', jobId)
      );

      const snapshot = await getDocs(jobQuery);
      
      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as SimplifiedTranscriptionJobData;

    } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const allJobsQuery = query(collection(db, 'transcriptions'));
      const snapshot = await getDocs(allJobsQuery);
      
      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        error: 0,
        queuedForAdmin: 0,
        total: snapshot.docs.length
      };

      snapshot.docs.forEach(doc => {
        const job = doc.data() as SimplifiedTranscriptionJobData;
        switch (job.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'processing':
            stats.processing++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'error':
            stats.error++;
            break;
          case 'queued_for_admin':
          case 'admin_review':
            stats.queuedForAdmin++;
            break;
        }
      });

      return stats;

    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed jobs (admin utility)
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldJobsQuery = query(
        collection(db, 'transcriptions'),
        where('status', '==', 'completed'),
        where('completedAt', '<', cutoffDate)
      );

      const snapshot = await getDocs(oldJobsQuery);
      let deletedCount = 0;

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, 'transcriptions', docSnapshot.id));
        deletedCount++;
      }

      console.log(`🧹 Cleaned up ${deletedCount} old completed jobs`);
      return deletedCount;

    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
      throw error;
    }
  }

  /**
   * Real-time subscription to job updates
   */
  subscribeToJobUpdates(
    userId: string, 
    callback: (jobs: SimplifiedTranscriptionJobData[]) => void
  ): () => void {
    const jobsQuery = query(
      collection(db, 'transcriptions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(jobsQuery, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimplifiedTranscriptionJobData[];

      callback(jobs);
    });
  }

  /**
   * Get jobs with retry info for admin debugging
   */
  async getJobRetryInfo(jobId: string): Promise<{
    canRetry: boolean;
    retryCount: number;
    maxRetries: number;
    lastError?: string;
  }> {
    const job = await this.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    const canRetry = job.status === 'error' && job.retryCount < job.maxRetries;

    return {
      canRetry,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      lastError: job.error
    };
  }

  /**
   * Retry a failed job (admin function)
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      const retryInfo = await this.getJobRetryInfo(jobId);
      
      if (!retryInfo.canRetry) {
        throw new Error('Job cannot be retried - either not in error state or max retries exceeded');
      }

      await this.updateJobStatus(jobId, 'pending', {
        retryCount: retryInfo.retryCount + 1,
        error: null,
        errorAt: null
      });

      console.log(`🔄 Retrying job ${jobId} (attempt ${retryInfo.retryCount + 1}/${retryInfo.maxRetries})`);

    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      throw error;
    }
  }
}

export const simplifiedTranscriptionQueue = new SimplifiedTranscriptionQueue();
export default simplifiedTranscriptionQueue;