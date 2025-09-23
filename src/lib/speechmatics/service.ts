import axios from 'axios';
import FormData from 'form-data';
import { TranscriptionJob, TranscriptionStatus, updateTranscriptionStatus } from '../firebase/transcriptions';

export interface SpeechmaticsConfig {
  language?: string;
  operatingPoint?: 'standard' | 'enhanced';
  enableDiarization?: boolean;
  enablePunctuation?: boolean;
}

export interface SpeechmaticsResult {
  success: boolean;
  transcript?: string;
  duration?: number;
  speakers?: number;
  confidence?: number;
  jobId?: string;
  error?: string;
}

export class SpeechmaticsService {
  private apiKey: string;
  private apiUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = process.env.SPEECHMATICS_API_KEY || '';
    this.apiUrl = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';
    this.isConfigured = !!this.apiKey;

    console.log(`[Speechmatics] Initializing service...`);
    console.log(`[Speechmatics] API URL: ${this.apiUrl}`);
    console.log(`[Speechmatics] API Key present: ${this.isConfigured}`);
    console.log(`[Speechmatics] API Key length: ${this.apiKey.length}`);

    if (!this.isConfigured) {
      console.warn('[Speechmatics] SPEECHMATICS_API_KEY environment variable is missing. Speechmatics functionality will be disabled.');
    } else {
      console.log('[Speechmatics] Service initialized successfully');
    }
  }

  /**
   * Check if Speechmatics is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Transcribe audio file using Speechmatics API
   */
  async transcribeAudio(
    audioBuffer: Buffer, 
    filename: string,
    config: SpeechmaticsConfig = {}
  ): Promise<SpeechmaticsResult> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Speechmatics API is not configured. Please set SPEECHMATICS_API_KEY environment variable.'
        };
      }

      const {
        language = 'en',
        operatingPoint = 'enhanced',
        enableDiarization = true,
        enablePunctuation = true
      } = config;

      console.log(`[Speechmatics] Starting transcription for ${filename}`);

      // Create FormData for Node.js (use form-data package)
      const formData = new FormData();

      // Append the audio buffer directly; let form-data handle streams/boundaries
      formData.append('data_file', audioBuffer, {
        filename: filename || 'audiofile',
        contentType: 'application/octet-stream',
      } as any);

      // Add the configuration as JSON (using only valid Speechmatics properties)
      const jobConfig = {
        type: 'transcription',
        transcription_config: {
          language,
          operating_point: operatingPoint
        }
      };
      
      formData.append('config', JSON.stringify(jobConfig));

      console.log(`[Speechmatics] Job config:`, JSON.stringify(jobConfig, null, 2));

      // Submit job with file and config in one request
      const createJobResponse = await axios.post(
        `${this.apiUrl}/jobs`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...formData.getHeaders?.(),
          },
          // Axios in Node will stream form-data; no need to set maxContentLength unless very large files
        }
      );

      const jobId = createJobResponse.data.id;
      console.log(`[Speechmatics] Created job and uploaded file: ${jobId}`);

      // Wait for completion (job starts automatically after upload)
      const result = await this.waitForCompletion(jobId);
      
      if (result.success) {
        console.log(`[Speechmatics] Successfully completed transcription for job: ${jobId}`);
      } else {
        console.error(`[Speechmatics] Transcription failed for job: ${jobId}`, result.error);
      }

      return result;

    } catch (error) {
      console.error('[Speechmatics] Transcription error:', error);
      
      let errorMessage = 'Failed to transcribe audio';
      
      if (axios.isAxiosError(error)) {
        console.error('[Speechmatics] Axios error details:');
        console.error('- Status:', error.response?.status);
        console.error('- Status text:', error.response?.statusText);
        console.error('- Response data:', JSON.stringify(error.response?.data, null, 2));
        console.error('- Request URL:', error.config?.url);
        console.error('- Request method:', error.config?.method);
        
        if (error.response?.status === 401) {
          errorMessage = 'Invalid Speechmatics API credentials';
        } else if (error.response?.status === 429) {
          errorMessage = 'Speechmatics rate limit exceeded';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.status === 400) {
          errorMessage = `Bad request to Speechmatics API: ${error.response?.statusText}`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Process a transcription job with Speechmatics
   */
  async processTranscriptionJob(
    transcriptionJobId: string,
    audioBuffer: Buffer,
    filename: string,
    config: SpeechmaticsConfig = {}
  ): Promise<void> {
    try {
      // Update job status to processing
      await updateTranscriptionStatus(transcriptionJobId, 'processing');

      // Transcribe with Speechmatics
      const result = await this.transcribeAudio(audioBuffer, filename, config);

      if (result.success && result.transcript) {
        // For AI mode, complete the job directly
        // For hybrid mode, set to pending-review
        const job = await this.getTranscriptionJob(transcriptionJobId);
        const finalStatus: TranscriptionStatus = job?.mode === 'hybrid' ? 'pending-review' : 'complete';

        await updateTranscriptionStatus(transcriptionJobId, finalStatus, {
          transcript: result.transcript,
          duration: result.duration || 0
        });

        console.log(`[Speechmatics] Updated transcription job ${transcriptionJobId} to ${finalStatus}`);
      } else {
        // Mark job as failed
        await updateTranscriptionStatus(transcriptionJobId, 'failed', {
          specialInstructions: result.error || 'Transcription failed'
        });
        
        console.error(`[Speechmatics] Failed to process job ${transcriptionJobId}:`, result.error);
      }

    } catch (error) {
      console.error(`[Speechmatics] Error processing transcription job ${transcriptionJobId}:`, error);
      
      // Mark job as failed
      await updateTranscriptionStatus(transcriptionJobId, 'failed', {
        specialInstructions: 'Internal processing error'
      });
    }
  }

  /**
   * Wait for Speechmatics job completion
   */
  private async waitForCompletion(jobId: string): Promise<SpeechmaticsResult> {
    const maxAttempts = 120; // 10 minutes max (5s intervals)
    let attempts = 0;
    let jobStatus = 'running';

    while (jobStatus === 'running' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const statusResponse = await axios.get(
          `${this.apiUrl}/jobs/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        jobStatus = statusResponse.data.job.status;
        attempts++;

        console.log(`[Speechmatics] Job ${jobId} status: ${jobStatus} (${attempts}/${maxAttempts})`);

        if (jobStatus === 'rejected') {
          await this.cleanupJob(jobId);
          return {
            success: false,
            error: 'Speechmatics rejected the transcription job',
            jobId
          };
        }

      } catch (error) {
        console.error(`[Speechmatics] Error checking job status for ${jobId}:`, error);
        await this.cleanupJob(jobId);
        return {
          success: false,
          error: 'Failed to check job status',
          jobId
        };
      }
    }

    if (jobStatus === 'done') {
      return await this.getTranscriptResult(jobId);
    } else {
      await this.cleanupJob(jobId);
      return {
        success: false,
        error: jobStatus === 'running' ? 'Transcription timed out' : `Job failed with status: ${jobStatus}`,
        jobId
      };
    }
  }

  /**
   * Get transcript result from completed job
   */
  private async getTranscriptResult(jobId: string): Promise<SpeechmaticsResult> {
    try {
      const transcriptResponse = await axios.get(
        `${this.apiUrl}/jobs/${jobId}/transcript`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      const data = transcriptResponse.data;
      
      // Extract transcript text
      const transcriptText = data.results
        ?.map((result: any) => result.alternatives?.[0]?.content || '')
        .join(' ')
        .trim() || '';

      // Extract metadata
      const duration = data.job?.duration || 0;
      const speakers = data.speakers?.length || 0;
      
      // Calculate average confidence if available
      let confidence = 0;
      if (data.results && data.results.length > 0) {
        const confidenceScores = data.results
          .map((result: any) => result.alternatives?.[0]?.confidence || 0)
          .filter((score: number) => score > 0);
        
        if (confidenceScores.length > 0) {
          confidence = confidenceScores.reduce((sum: number, score: number) => sum + score, 0) / confidenceScores.length;
        }
      }

      await this.cleanupJob(jobId);

      return {
        success: true,
        transcript: transcriptText,
        duration,
        speakers,
        confidence,
        jobId
      };

    } catch (error) {
      console.error(`[Speechmatics] Error retrieving transcript for ${jobId}:`, error);
      await this.cleanupJob(jobId);
      
      return {
        success: false,
        error: 'Failed to retrieve transcript',
        jobId
      };
    }
  }

  /**
   * Clean up Speechmatics job
   */
  private async cleanupJob(jobId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.apiUrl}/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      console.log(`[Speechmatics] Cleaned up job: ${jobId}`);
    } catch (error) {
      console.warn(`[Speechmatics] Failed to clean up job ${jobId}:`, error);
    }
  }

  /**
   * Helper method to get transcription job details
   */
  private async getTranscriptionJob(jobId: string): Promise<TranscriptionJob | null> {
    try {
      // This would need to be imported from your transcriptions service
      const { getTranscriptionById } = await import('../firebase/transcriptions');
      return await getTranscriptionById(jobId);
    } catch (error) {
      console.error('Error fetching transcription job:', error);
      return null;
    }
  }
}

// Export singleton instance
export const speechmaticsService = new SpeechmaticsService();