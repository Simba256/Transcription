import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Speechmatics API types
export interface SpeechmaticsConfig {
  type: 'transcription';
  transcription_config: {
    language: string;
    output_locale?: string;
    diarization?: 'speaker' | 'channel';
    speaker_diarization_config?: {
      max_speakers?: number;
    };
    punctuation_permitted?: boolean;
    format?: 'txt' | 'json-v2' | 'srt';
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
        language: 'en',
        punctuation_permitted: true,
        diarization: 'speaker',
        speaker_diarization_config: {
          max_speakers: 8
        }
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
   * Check the status of a transcription job
   */
  async getJobStatus(jobId: string): Promise<TranscriptionJob> {
    if (!this.apiKey) {
      throw new Error('Speechmatics API key not configured');
    }

    try {
      const response: AxiosResponse<TranscriptionJob> = await axios.get(
        `${this.baseUrl}/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Speechmatics status check error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Transcription job not found');
      }
      
      throw new Error(`Status check failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get the transcript result from a completed job
   */
  async getTranscript(jobId: string, format: 'json-v2' | 'txt' | 'srt' = 'json-v2'): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Speechmatics API key not configured');
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
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Speechmatics transcript retrieval error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Transcript not found or job not completed');
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
   * Process a complete transcription workflow
   */
  async processTranscription(
    audioUrl: string,
    fileName: string,
    firestoreDocId: string,
    config?: Partial<SpeechmaticsConfig>
  ): Promise<string> {
    try {
      // Download the audio file
      const audioResponse = await axios.get(audioUrl, { responseType: 'stream' });
      
      // Submit for transcription
      const fullConfig: SpeechmaticsConfig = {
        type: 'transcription',
        transcription_config: {
          language: 'en',
          punctuation_permitted: true,
          diarization: 'speaker',
          speaker_diarization_config: {
            max_speakers: 8
          },
          ...config?.transcription_config
        }
      };

      const { job_id } = await this.submitTranscriptionJob(
        audioResponse.data,
        fileName,
        fullConfig
      );

      // Update Firestore with job ID
      await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
        speechmaticsJobId: job_id,
        status: 'processing',
        submittedAt: serverTimestamp()
      });

      return job_id;
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
   * Poll job status and update Firestore when complete
   */
  async pollJobStatus(jobId: string, firestoreDocId: string, maxAttempts: number = 60): Promise<boolean> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const job = await this.getJobStatus(jobId);
        
        // Update Firestore with current status
        await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
          speechmaticsStatus: job.status,
          lastCheckedAt: serverTimestamp()
        });

        if (job.status === 'done') {
          // Get the transcript
          const transcript = await this.getTranscript(jobId, 'json-v2');
          const transcriptText = this.extractTextFromTranscript(transcript);
          
          // Update Firestore with completed transcript
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'completed',
            transcript: transcriptText,
            fullTranscript: transcript,
            completedAt: serverTimestamp(),
            duration: job.duration
          });
          
          return true;
        } else if (job.status === 'rejected') {
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
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
   * Extract plain text from Speechmatics JSON transcript
   */
  private extractTextFromTranscript(transcript: TranscriptionResult): string {
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