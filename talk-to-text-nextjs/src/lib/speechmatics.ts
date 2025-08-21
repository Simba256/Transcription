import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Speechmatics API types
export interface SpeechmaticsConfig {
  type: 'transcription';
  transcription_config: {
    language: string;
    diarization?: 'speaker' | 'channel';
  };
}

export interface TranscriptionJob {
  id: string;
  status: 'running' | 'done' | 'rejected';
  created_at: string;
  data_name?: string;
  duration?: number;
  format?: {
    type: string;
    config: SpeechmaticsConfig;
  };
}

export interface TranscriptionResult {
  job: TranscriptionJob;
  results?: Array<{
    alternatives: Array<{
      confidence: number;
      content: string;
      language?: string;
      speaker?: string;
    }>;
    end_time: number;
    start_time: number;
    type: 'word';
  }>;
  format?: string;
}

export interface SpeechmaticsError {
  code: string;
  detail: string;
}

class SpeechmaticsService {
  private apiKey: string;
  private baseUrl = 'https://asr.api.speechmatics.com/v2';

  constructor() {
    this.apiKey = process.env.SPEECHMATICS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('SPEECHMATICS_API_KEY not found in environment variables');
    } else {
      console.log('Speechmatics service initialized with API key');
    }
  }

  /**
   * Test if the Speechmatics API is properly configured and accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }
      
      // Make a simple request to test the connection
      const response = await axios.get(`${this.baseUrl}/jobs`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        params: { limit: 1 } // Just get 1 job to test
      });
      
      console.log('Speechmatics API connection test successful');
      return true;
    } catch (error: any) {
      console.error('Speechmatics API connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Submit an audio file for transcription
   */
  async submitTranscriptionJob(
    audioFile: File | Buffer,
    fileName: string,
    config: SpeechmaticsConfig = {
      type: 'transcription',
      transcription_config: {
        language: 'en'
      }
    }
  ): Promise<{ job_id: string }> {
    if (!this.apiKey) {
      throw new Error('Speechmatics API key not configured');
    }

    const formData = new FormData();
    formData.append('data_file', audioFile, fileName);
    formData.append('config', JSON.stringify(config));

    try {
      const response: AxiosResponse<{ id: string }> = await axios.post(
        `${this.baseUrl}/jobs`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      return { job_id: response.data.id };
    } catch (error: any) {
      console.error('Speechmatics job submission error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Speechmatics API key');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid audio file or configuration');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Transcription submission failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Check the status of a transcription job (client-side)
   */
  async getJobStatus(jobId: string): Promise<TranscriptionJob> {
    try {
      const response = await axios.get(`/api/transcription/status?jobId=${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error('Status check error:', error.response?.data || error.message);
      throw new Error(`Status check failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Check the status of a transcription job (server-side - direct API call)
   */
  async getJobStatusDirect(jobId: string): Promise<TranscriptionJob> {
    if (!this.apiKey) {
      throw new Error('Speechmatics API key not configured');
    }

    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      throw new Error('Invalid job ID provided');
    }

    try {
      const response: AxiosResponse<TranscriptionJob> = await axios.get(
        `${this.baseUrl}/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      const job = response.data;
      
      // Validate the response has required fields
      if (!job || !job.status) {
        throw new Error('Invalid response from Speechmatics API: missing status');
      }
      
      // Ensure status is a valid string
      if (typeof job.status !== 'string' || job.status.trim() === '') {
        throw new Error(`Invalid job status from Speechmatics: ${job.status}`);
      }
      
      return job;
    } catch (error: any) {
      console.error('Direct status check error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Job not found in Speechmatics');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Speechmatics API key');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Status check failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get the transcript result from a completed job (client-side)
   */
  async getTranscript(jobId: string, format: 'json-v2' | 'txt' | 'srt' = 'json-v2'): Promise<any> {
    try {
      const response = await axios.get(`/api/transcription/result?jobId=${jobId}&format=${format}`);
      return response.data;
    } catch (error: any) {
      console.error('Transcript retrieval error:', error.response?.data || error.message);
      throw new Error(`Transcript retrieval failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get the transcript result from a completed job (server-side - direct API call)
   */
  async getTranscriptDirect(jobId: string, format: 'json-v2' | 'txt' | 'srt' = 'json-v2'): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Speechmatics API key not configured');
    }

    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      throw new Error('Invalid job ID provided');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/jobs/${jobId}/transcript`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': format === 'json-v2' ? 'application/json' : 'text/plain'
          },
          params: {
            format: format
          },
          timeout: 30000 // 30 second timeout for transcript download
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Direct transcript retrieval error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Job or transcript not found in Speechmatics');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Speechmatics API key');
      } else if (error.response?.status === 423) {
        throw new Error('Job not yet completed or failed');
      }
      
      throw new Error(`Transcript retrieval failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Delete a transcription job
   */
  async deleteJob(jobId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Speechmatics API key not configured');
    }

    try {
      await axios.delete(
        `${this.baseUrl}/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
    } catch (error: any) {
      console.error('Speechmatics job deletion error:', error.response?.data || error.message);
      throw new Error(`Job deletion failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Process a complete transcription workflow (client-side)
   */
  async processTranscription(
    audioFile: File,
    fileName: string,
    firestoreDocId: string,
    config?: Partial<SpeechmaticsConfig>
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audioFile', audioFile);
      formData.append('fileName', fileName);
      formData.append('firestoreDocId', firestoreDocId);
      formData.append('language', config?.transcription_config?.language || 'en');
      formData.append('diarization', (config?.transcription_config?.diarization === 'speaker').toString());

      const response = await axios.post('/api/transcription/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { jobId } = response.data;

      // Update Firestore with job ID
      await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
        speechmaticsJobId: jobId,
        status: 'processing',
        submittedAt: serverTimestamp()
      });

      return jobId;
    } catch (error) {
      // Update Firestore with error
      await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorAt: serverTimestamp()
      });
      
      throw error;
    }
  }

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
   * Poll job status and update Firestore when complete
   */
  async pollJobStatus(jobId: string, firestoreDocId: string, maxAttempts: number = 60): Promise<boolean> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const job = await this.getJobStatusDirect(jobId);
        
        // Validate job status before updating Firestore
        if (!job || !job.status) {
          console.warn(`Invalid job status received for ${jobId}:`, job);
          attempts++;
          continue;
        }
        
        // Update Firestore with current status using safe update
        await this.safeUpdateDoc(doc(db, 'transcriptions', firestoreDocId), {
          speechmaticsStatus: job.status,
          lastCheckedAt: serverTimestamp()
        });

        if (job.status === 'done') {
          // Get the transcript
          const transcript = await this.getTranscriptDirect(jobId, 'json-v2');
          const transcriptText = this.extractTextFromTranscript(transcript);
          
          // Update Firestore with completed transcript using safe update
          await this.safeUpdateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'completed',
            transcript: transcriptText,
            fullTranscript: transcript,
            completedAt: serverTimestamp(),
            duration: job.duration
          });
          
          return true;
        } else if (job.status === 'rejected') {
          await this.safeUpdateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'error',
            error: 'Job rejected by Speechmatics',
            errorAt: serverTimestamp()
          });
          
          return false;
        }

        // Wait 30 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 30000));
        attempts++;
      } catch (error) {
        console.error(`Polling attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'error',
            error: 'Polling timeout exceeded',
            errorAt: serverTimestamp()
          });
          
          return false;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    return false;
  }

  /**
   * Force check a job status and update if needed (useful for stuck jobs)
   */
  async forceCheckJobStatus(speechmaticsJobId: string): Promise<{
    status: string;
    duration?: number;
    transcriptAvailable: boolean;
  }> {
    try {
      const job = await this.getJobStatusDirect(speechmaticsJobId);
      
      let transcriptAvailable = false;
      if (job.status === 'done') {
        try {
          await this.getTranscriptDirect(speechmaticsJobId, 'json-v2');
          transcriptAvailable = true;
        } catch (error) {
          console.warn('Job marked as done but transcript not available:', error);
        }
      }
      
      return {
        status: job.status,
        duration: job.duration,
        transcriptAvailable
      };
    } catch (error) {
      console.error('Error force checking job status:', error);
      throw error;
    }
  }

  /**
   * Extract plain text from Speechmatics JSON transcript
   */
  extractTextFromTranscript(transcript: TranscriptionResult): string {
    if (!transcript.results) {
      return '';
    }

    return transcript.results
      .filter(result => result.type === 'word')
      .map(result => result.alternatives[0]?.content || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Format transcript with timestamps and speakers
   */
  formatTranscriptWithTimestamps(transcript: TranscriptionResult): string {
    if (!transcript.results) {
      return '';
    }

    let formattedText = '';
    let currentSpeaker = '';
    let currentSentence = '';
    
    for (const result of transcript.results) {
      if (result.type === 'word' && result.alternatives[0]) {
        const word = result.alternatives[0];
        const speaker = word.speaker || 'Unknown';
        
        if (speaker !== currentSpeaker) {
          if (currentSentence.trim()) {
            formattedText += `${currentSpeaker}: ${currentSentence.trim()}\n\n`;
          }
          currentSpeaker = speaker;
          currentSentence = '';
        }
        
        currentSentence += word.content + ' ';
      }
    }
    
    // Add final sentence
    if (currentSentence.trim()) {
      formattedText += `${currentSpeaker}: ${currentSentence.trim()}`;
    }
    
    return formattedText.trim();
  }
}

// Export singleton instance
export const speechmaticsService = new SpeechmaticsService();
export default speechmaticsService;