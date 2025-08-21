import { transcriptionQueue, TranscriptionJobData } from './transcription-queue';
import { speechmaticsService } from './speechmatics';
import { updateUserUsage } from './firestore';
import { estimateAudioDuration } from './storage';
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface CreateTranscriptionOptions {
  language?: string;
  diarization?: boolean;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  maxRetries?: number;
}

export interface TranscriptionMetrics {
  totalJobs: number;
  completedJobs: number;
  errorJobs: number;
  averageProcessingTime: number;
  totalDuration: number;
}

class TranscriptionService {
  /**
   * Create a new transcription job
   */
  async createTranscription(
    userId: string,
    fileName: string,
    fileUrl: string,
    fileSize: number,
    options: CreateTranscriptionOptions = {}
  ): Promise<string> {
    try {
      // Validate inputs
      if (!userId || !fileName || !fileUrl) {
        throw new Error('Missing required parameters for transcription creation');
      }

      if (fileSize > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File size exceeds maximum limit of 100MB');
      }

      // Estimate audio duration for usage tracking
      const estimatedDuration = estimateAudioDuration(fileSize);

      // Create job data
      const jobData: Omit<TranscriptionJobData, 'id' | 'createdAt' | 'retryCount'> = {
        userId,
        fileName,
        fileUrl,
        fileSize,
        status: 'pending',
        priority: options.priority || 'normal',
        language: options.language || 'en',
        diarization: options.diarization ?? true,
        tags: options.tags || [],
        maxRetries: options.maxRetries || 3
      };

      // Add job to queue
      const jobId = await transcriptionQueue.addJob(jobData);

      // Update user usage statistics
      await this.updateUserTranscriptionUsage(userId, estimatedDuration);

      return jobId;
    } catch (error) {
      console.error('Error creating transcription:', error);
      throw error;
    }
  }

  /**
   * Get transcription by ID
   */
  async getTranscription(userId: string, jobId: string): Promise<TranscriptionJobData | null> {
    try {
      const userJobs = await transcriptionQueue.getUserJobs(userId);
      const job = userJobs.find(j => j.id === jobId);
      
      return job || null;
    } catch (error) {
      console.error('Error getting transcription:', error);
      throw new Error('Failed to retrieve transcription');
    }
  }

  /**
   * Get all transcriptions for a user
   */
  async getUserTranscriptions(
    userId: string,
    status?: TranscriptionJobData['status'],
    limit: number = 50
  ): Promise<TranscriptionJobData[]> {
    try {
      return await transcriptionQueue.getUserJobs(userId, status, limit);
    } catch (error) {
      console.error('Error getting user transcriptions:', error);
      throw new Error('Failed to retrieve user transcriptions');
    }
  }

  /**
   * Subscribe to real-time transcription updates
   */
  subscribeToTranscriptions(
    userId: string,
    callback: (transcriptions: TranscriptionJobData[]) => void,
    status?: TranscriptionJobData['status']
  ): () => void {
    return transcriptionQueue.subscribeToUserJobs(userId, callback, status);
  }

  /**
   * Retry a failed transcription
   */
  async retryTranscription(userId: string, jobId: string): Promise<void> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      if (job.status !== 'error') {
        throw new Error('Can only retry failed transcriptions');
      }

      // Check retry capability first
      const retryInfo = await transcriptionQueue.getJobRetryInfo(jobId);
      
      if (retryInfo.needsResubmission) {
        throw new Error('This transcription needs to be re-uploaded. The original file was never properly submitted to the transcription service. Please upload the audio file again.');
      }

      if (!retryInfo.canRetry) {
        throw new Error(`Cannot retry: ${retryInfo.reason}`);
      }

      // Check if retry count exceeded - if so, reset it
      if (job.retryCount >= job.maxRetries) {
        await transcriptionQueue.resetRetryCount(jobId);
      }

      await transcriptionQueue.retryJob(jobId);
    } catch (error) {
      console.error('Error retrying transcription:', error);
      throw error;
    }
  }

  /**
   * Refresh transcription status from Speechmatics
   */
  async refreshTranscriptionStatus(userId: string, jobId: string): Promise<void> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      await transcriptionQueue.refreshJobStatus(jobId);
    } catch (error) {
      console.error('Error refreshing transcription status:', error);
      throw error;
    }
  }

  /**
   * Reset retry count for a transcription (allows retrying jobs that exceeded max retries)
   */
  async resetTranscriptionRetries(userId: string, jobId: string): Promise<void> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      await transcriptionQueue.resetRetryCount(jobId);
    } catch (error) {
      console.error('Error resetting transcription retries:', error);
      throw error;
    }
  }

  /**
   * Force check and retrieve transcript for a job (even if marked as failed)
   */
  async forceRetrieveTranscript(userId: string, jobId: string): Promise<string | null> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      // If we already have a transcript, return it
      if (job.transcript) {
        return job.transcript;
      }

      // If we have a speechmatics job ID, try to get the transcript directly
      if (job.speechmaticsJobId) {
        try {
          const transcript = await speechmaticsService.getTranscriptDirect(job.speechmaticsJobId, 'json-v2');
          const transcriptText = speechmaticsService.extractTextFromTranscript(transcript);
          
          if (transcriptText) {
            // Update the job with the retrieved transcript
            await transcriptionQueue.forceCompleteJob(jobId, transcriptText);
            return transcriptText;
          }
        } catch (error) {
          console.warn('Failed to retrieve transcript from Speechmatics:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Error force retrieving transcript:', error);
      throw error;
    }
  }

  /**
   * Diagnose a stuck transcription job
   */
  async diagnoseStuckJob(userId: string, jobId: string): Promise<{
    jobStatus: string;
    speechmaticsStatus?: string;
    lastChecked?: Date;
    recommendation: string;
    canForceCheck: boolean;
  }> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      const result = {
        jobStatus: job.status,
        speechmaticsStatus: job.speechmaticsStatus,
        lastChecked: job.lastCheckedAt ? new Date(job.lastCheckedAt.seconds * 1000) : undefined,
        recommendation: '',
        canForceCheck: !!job.speechmaticsJobId
      };

      // Provide recommendations based on job state
      if (job.status === 'processing') {
        const timeSinceCreated = Date.now() - (job.createdAt.seconds * 1000);
        const hoursSinceCreated = timeSinceCreated / (1000 * 60 * 60);

        if (hoursSinceCreated > 2) {
          result.recommendation = 'Job has been processing for over 2 hours. Try "Force Check Status" to update from Speechmatics.';
        } else if (hoursSinceCreated > 0.5) {
          result.recommendation = 'Job has been processing for a while. You can try "Force Check Status" or wait a bit longer.';
        } else {
          result.recommendation = 'Job is recently created. Processing typically takes a few minutes.';
        }

        if (!job.speechmaticsJobId) {
          result.recommendation = 'Job was never submitted to Speechmatics. Try retrying the transcription.';
          result.canForceCheck = false;
        }
      } else if (job.status === 'error') {
        result.recommendation = 'Job failed. Check error details and try retrying or force retrieving transcript.';
      } else if (job.status === 'completed') {
        result.recommendation = 'Job is completed successfully.';
      }

      return result;
    } catch (error) {
      console.error('Error diagnosing stuck job:', error);
      throw error;
    }
  }

  /**
   * Get retry information for a transcription
   */
  async getTranscriptionRetryInfo(userId: string, jobId: string): Promise<{
    canRetry: boolean;
    needsResubmission: boolean;
    reason: string;
  }> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      return await transcriptionQueue.getJobRetryInfo(jobId);
    } catch (error) {
      console.error('Error getting transcription retry info:', error);
      return {
        canRetry: false,
        needsResubmission: false,
        reason: 'Error checking retry status'
      };
    }
  }

  /**
   * Cancel a transcription
   */
  async cancelTranscription(userId: string, jobId: string): Promise<void> {
    try {
      // Verify the job belongs to the user
      const job = await this.getTranscription(userId, jobId);
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      if (job.status === 'completed') {
        throw new Error('Cannot cancel completed transcriptions');
      }

      await transcriptionQueue.cancelJob(jobId);
    } catch (error) {
      console.error('Error canceling transcription:', error);
      throw error;
    }
  }

  /**
   * Download transcription result
   */
  async downloadTranscription(
    userId: string, 
    jobId: string, 
    format: 'txt' | 'json' | 'srt' = 'txt'
  ): Promise<string> {
    try {
      const job = await this.getTranscription(userId, jobId);
      
      if (!job) {
        throw new Error('Transcription not found or access denied');
      }

      if (job.status !== 'completed') {
        throw new Error('Transcription not yet completed');
      }

      if (!job.transcript) {
        throw new Error('Transcript data not available');
      }

      switch (format) {
        case 'txt':
          return job.transcript;
        
        case 'json':
          return JSON.stringify(job.fullTranscript || { transcript: job.transcript }, null, 2);
        
        case 'srt':
          return this.convertToSRT(job.fullTranscript || { results: [] });
        
        default:
          return job.transcript;
      }
    } catch (error) {
      console.error('Error downloading transcription:', error);
      throw error;
    }
  }

  /**
   * Get transcription metrics for a user
   */
  async getUserMetrics(userId: string): Promise<TranscriptionMetrics> {
    try {
      const jobs = await this.getUserTranscriptions(userId);
      
      const metrics: TranscriptionMetrics = {
        totalJobs: jobs.length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        errorJobs: jobs.filter(j => j.status === 'error').length,
        averageProcessingTime: 0,
        totalDuration: 0
      };

      // Calculate average processing time
      const completedJobs = jobs.filter(j => j.status === 'completed' && j.submittedAt && j.completedAt);
      if (completedJobs.length > 0) {
        const totalProcessingTime = completedJobs.reduce((sum, job) => {
          if (job.submittedAt && job.completedAt) {
            return sum + (job.completedAt.seconds - job.submittedAt.seconds);
          }
          return sum;
        }, 0);
        
        metrics.averageProcessingTime = totalProcessingTime / completedJobs.length;
      }

      // Calculate total duration
      metrics.totalDuration = jobs.reduce((sum, job) => {
        return sum + (job.duration || 0);
      }, 0);

      return metrics;
    } catch (error) {
      console.error('Error getting user metrics:', error);
      throw new Error('Failed to retrieve transcription metrics');
    }
  }

  /**
   * Update user transcription usage
   */
  private async updateUserTranscriptionUsage(userId: string, estimatedDuration: number): Promise<void> {
    try {
      await updateUserUsage(userId, {
        trialUploads: 1,
        totalTranscribed: Math.round(estimatedDuration / 60), // Convert to minutes
        trialTimeUsed: Math.round(estimatedDuration / 60)
      });
    } catch (error) {
      console.error('Error updating user usage:', error);
      // Don't throw here as the transcription should still proceed
    }
  }

  /**
   * Convert Speechmatics transcript to SRT format
   */
  private convertToSRT(transcript: any): string {
    if (!transcript.results) {
      return '';
    }

    let srtContent = '';
    let subtitleIndex = 1;
    let currentSentence = '';
    let startTime = 0;
    let endTime = 0;

    for (let i = 0; i < transcript.results.length; i++) {
      const result = transcript.results[i];
      
      if (result.type === 'word' && result.alternatives[0]) {
        const word = result.alternatives[0];
        
        if (currentSentence === '') {
          startTime = result.start_time;
        }
        
        currentSentence += word.content + ' ';
        endTime = result.end_time;

        // Create subtitle every 5 seconds or at sentence end
        const shouldCreateSubtitle = 
          (endTime - startTime >= 5) || 
          word.content.match(/[.!?]$/) ||
          i === transcript.results.length - 1;

        if (shouldCreateSubtitle && currentSentence.trim()) {
          srtContent += `${subtitleIndex}\n`;
          srtContent += `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n`;
          srtContent += `${currentSentence.trim()}\n\n`;
          
          subtitleIndex++;
          currentSentence = '';
        }
      }
    }

    return srtContent;
  }

  /**
   * Format time for SRT format
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Validate transcription parameters
   */
  validateTranscriptionOptions(options: CreateTranscriptionOptions): boolean {
    const validLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
    const validPriorities = ['low', 'normal', 'high'];

    if (options.language && !validLanguages.includes(options.language)) {
      throw new Error(`Unsupported language: ${options.language}`);
    }

    if (options.priority && !validPriorities.includes(options.priority)) {
      throw new Error(`Invalid priority: ${options.priority}`);
    }

    if (options.maxRetries !== undefined && (options.maxRetries < 0 || options.maxRetries > 10)) {
      throw new Error('Max retries must be between 0 and 10');
    }

    return true;
  }

  /**
   * Check if user can create transcription (quota limits)
   */
  async canUserCreateTranscription(userId: string): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      const userJobs = await this.getUserTranscriptions(userId);
      const pendingJobs = userJobs.filter(j => j.status === 'pending' || j.status === 'processing');

      // Limit concurrent jobs
      if (pendingJobs.length >= 5) {
        return {
          canCreate: false,
          reason: 'Maximum concurrent transcriptions reached (5). Please wait for current jobs to complete.'
        };
      }

      return { canCreate: true };
    } catch (error) {
      console.error('Error checking user transcription eligibility:', error);
      return {
        canCreate: false,
        reason: 'Unable to verify transcription eligibility'
      };
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;