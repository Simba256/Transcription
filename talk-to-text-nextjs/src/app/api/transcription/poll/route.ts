import { NextRequest, NextResponse } from 'next/server';
import { speechmaticsService } from '@/lib/speechmatics';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { jobId, speechmaticsJobId } = await request.json();

    if (!jobId || !speechmaticsJobId) {
      return NextResponse.json(
        { error: 'Both jobId and speechmaticsJobId are required' },
        { status: 400 }
      );
    }

    // Get current job status from Speechmatics
    const speechmaticsJob = await speechmaticsService.getJobStatusDirect(speechmaticsJobId);
    
    if (!speechmaticsJob || !speechmaticsJob.status) {
      return NextResponse.json(
        { error: 'Invalid response from Speechmatics API' },
        { status: 500 }
      );
    }

    // Update Firestore with current status
    const jobDocRef = doc(db, 'transcriptions', jobId);
    await updateDoc(jobDocRef, {
      speechmaticsStatus: speechmaticsJob.status,
      lastCheckedAt: serverTimestamp()
    });

    if (speechmaticsJob.status === 'done') {
      try {
        // Get the transcript
        const transcript = await speechmaticsService.getTranscriptDirect(speechmaticsJobId, 'json-v2');
        const transcriptText = speechmaticsService.extractTextFromTranscript(transcript);
        
        // Update Firestore with completed transcript
        await updateDoc(jobDocRef, {
          status: 'completed',
          transcript: transcriptText,
          fullTranscript: transcript,
          completedAt: serverTimestamp(),
          duration: speechmaticsJob.duration
        });

        return NextResponse.json({
          status: 'completed',
          transcript: transcriptText,
          duration: speechmaticsJob.duration
        });
      } catch (transcriptError) {
        console.error('Error retrieving transcript:', transcriptError);
        await updateDoc(jobDocRef, {
          status: 'error',
          error: 'Failed to retrieve transcript from Speechmatics',
          errorAt: serverTimestamp()
        });
        
        return NextResponse.json(
          { error: 'Failed to retrieve transcript' },
          { status: 500 }
        );
      }
    } else if (speechmaticsJob.status === 'rejected') {
      await updateDoc(jobDocRef, {
        status: 'error',
        error: 'Job rejected by Speechmatics',
        errorAt: serverTimestamp()
      });
      
      return NextResponse.json({
        status: 'error',
        error: 'Job rejected by Speechmatics'
      });
    }

    // Job is still running
    return NextResponse.json({
      status: speechmaticsJob.status,
      speechmaticsStatus: speechmaticsJob.status
    });

  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Polling failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job from Firestore
    const jobDoc = await getDoc(doc(db, 'transcriptions', jobId));
    
    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();
    
    if (!jobData.speechmaticsJobId) {
      return NextResponse.json(
        { error: 'Job has no Speechmatics job ID' },
        { status: 400 }
      );
    }

    // Check status from Speechmatics
    const speechmaticsJob = await speechmaticsService.getJobStatusDirect(jobData.speechmaticsJobId);
    
    return NextResponse.json({
      firestoreStatus: jobData.status,
      speechmaticsStatus: speechmaticsJob.status,
      transcript: jobData.transcript,
      duration: speechmaticsJob.duration,
      lastCheckedAt: jobData.lastCheckedAt,
      completedAt: jobData.completedAt
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}