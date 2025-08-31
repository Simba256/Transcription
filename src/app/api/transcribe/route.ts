import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get the audio file from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = (formData.get('language') as string) || 'en';
    const operatingPoint = (formData.get('operatingPoint') as string) || 'enhanced';
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    if (!process.env.SPEECHMATICS_API_KEY || !process.env.SPEECHMATICS_API_URL) {
      console.error('Missing required environment variables for Speechmatics');
      return NextResponse.json(
        { error: 'Transcription service configuration error' },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Starting transcription for file: ${audioFile.name} (${audioFile.size} bytes)`);

    // Create job with Speechmatics
    const createJobResponse = await axios.post(
      `${process.env.SPEECHMATICS_API_URL}/jobs`,
      {
        config: {
          type: 'transcription',
          transcription_config: {
            language: language,
            operating_point: operatingPoint,
            enable_partials: false,
            max_delay: 2,
            diarization: 'speaker',
            punctuation_permitted: true,
            output_locale: 'en-US'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SPEECHMATICS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const jobId = createJobResponse.data.id;
    console.log(`Created Speechmatics job: ${jobId}`);

    // Upload audio file
    const uploadFormData = new FormData();
    uploadFormData.append('data_file', new Blob([buffer]), audioFile.name);

    await axios.put(
      `${process.env.SPEECHMATICS_API_URL}/jobs/${jobId}/data`,
      uploadFormData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SPEECHMATICS_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    console.log(`Uploaded data for job: ${jobId}`);

    // Start the job
    await axios.put(
      `${process.env.SPEECHMATICS_API_URL}/jobs/${jobId}/start`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${process.env.SPEECHMATICS_API_KEY}`
        }
      }
    );

    console.log(`Started job: ${jobId}`);

    // Poll for job completion
    let jobStatus = 'running';
    let transcript = null;
    const maxAttempts = 120; // 10 minutes max wait (5s intervals)
    let attempts = 0;

    while (jobStatus === 'running' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const statusResponse = await axios.get(
          `${process.env.SPEECHMATICS_API_URL}/jobs/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.SPEECHMATICS_API_KEY}`
            }
          }
        );

        jobStatus = statusResponse.data.job.status;
        attempts++;
        
        console.log(`Job ${jobId} status: ${jobStatus} (attempt ${attempts}/${maxAttempts})`);
        
        if (jobStatus === 'rejected') {
          throw new Error('Speechmatics job was rejected');
        }
      } catch (statusError) {
        console.error(`Error checking job status for ${jobId}:`, statusError);
        break;
      }
    }

    if (jobStatus === 'done') {
      try {
        // Get transcript
        const transcriptResponse = await axios.get(
          `${process.env.SPEECHMATICS_API_URL}/jobs/${jobId}/transcript`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.SPEECHMATICS_API_KEY}`,
              'Accept': 'application/json'
            }
          }
        );

        transcript = transcriptResponse.data;
        console.log(`Successfully retrieved transcript for job: ${jobId}`);
      } catch (transcriptError) {
        console.error(`Error retrieving transcript for ${jobId}:`, transcriptError);
      }
    }

    // Clean up - delete the job
    try {
      await axios.delete(
        `${process.env.SPEECHMATICS_API_URL}/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SPEECHMATICS_API_KEY}`
          }
        }
      );
      console.log(`Cleaned up job: ${jobId}`);
    } catch (cleanupError) {
      console.warn(`Failed to clean up job ${jobId}:`, cleanupError);
    }

    if (transcript && transcript.results && transcript.results.length > 0) {
      // Extract the transcript text from Speechmatics format
      const transcriptText = transcript.results
        .map((result: any) => result.alternatives?.[0]?.content || '')
        .join(' ')
        .trim();

      // Extract additional metadata
      const duration = transcript.job?.duration || 0;
      const speakers = transcript.speakers || [];
      
      return NextResponse.json({ 
        success: true, 
        transcript: transcriptText,
        duration: duration,
        speakers: speakers.length,
        fullData: transcript,
        jobId: jobId
      });
    } else {
      const errorMessage = jobStatus === 'running' 
        ? 'Transcription timed out' 
        : `Transcription failed with status: ${jobStatus}`;
      
      console.error(`Transcription failed for job ${jobId}: ${errorMessage}`);
      
      return NextResponse.json(
        { error: errorMessage, jobId: jobId },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Speechmatics transcription error:', error);
    
    let errorMessage = 'Failed to transcribe audio';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        errorMessage = 'Invalid API credentials';
        statusCode = 401;
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded';
        statusCode = 429;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
}