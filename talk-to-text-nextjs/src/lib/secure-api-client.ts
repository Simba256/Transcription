import { auth } from './firebase';

class SecureApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();
    return {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    };
  }

  private async getAuthHeadersFormData(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();
    return {
      'Authorization': `Bearer ${idToken}`
    };
  }

  async processTranscription(
    audioFile: File,
    fileName: string,
    firestoreDocId: string,
    language: string = 'en',
    diarization: boolean = true
  ): Promise<{ success: boolean; jobId: string; firestoreDocId: string }> {
    const formData = new FormData();
    formData.append('audioFile', audioFile);
    formData.append('fileName', fileName);
    formData.append('firestoreDocId', firestoreDocId);
    formData.append('language', language);
    formData.append('diarization', diarization.toString());

    const headers = await this.getAuthHeadersFormData();

    const response = await fetch('/api/transcription/process', {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process transcription');
    }

    return await response.json();
  }

  async getTranscript(jobId: string, format: 'json-v2' | 'txt' | 'srt' = 'json-v2'): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`/api/transcription/result?jobId=${jobId}&format=${format}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get transcript');
    }

    return await response.json();
  }

  async getJobStatus(jobId: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`/api/transcription/status?jobId=${jobId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get job status');
    }

    return await response.json();
  }

  async pollJobStatus(jobId: string, speechmaticsJobId: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch('/api/transcription/poll', {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId, speechmaticsJobId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to poll job status');
    }

    return await response.json();
  }

  // Generic GET method
  async get(url: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `GET ${url} failed`);
    }

    return await response.json();
  }

  // Generic POST method
  async post(url: string, data: any): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `POST ${url} failed`);
    }

    return await response.json();
  }
}

export const secureApiClient = new SecureApiClient();
export default secureApiClient;