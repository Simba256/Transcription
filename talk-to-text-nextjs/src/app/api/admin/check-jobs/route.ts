import { NextResponse } from 'next/server';
import { simplifiedTranscriptionQueue } from '@/lib/transcription-queue';

export async function GET() {
  try {
    // Get recent jobs
    const allJobs = await simplifiedTranscriptionQueue.getJobsByStatus('completed');
    const pendingJobs = await simplifiedTranscriptionQueue.getJobsByStatus('pending');
    const processingJobs = await simplifiedTranscriptionQueue.getJobsByStatus('processing');
    const errorJobs = await simplifiedTranscriptionQueue.getJobsByStatus('error');
    
    return NextResponse.json({
      success: true,
      jobs: {
        completed: allJobs.slice(0, 5), // Last 5 completed jobs
        pending: pendingJobs.slice(0, 5),
        processing: processingJobs.slice(0, 5),
        errors: errorJobs.slice(0, 5)
      },
      stats: {
        completed: allJobs.length,
        pending: pendingJobs.length,
        processing: processingJobs.length,
        errors: errorJobs.length
      }
    });
    
  } catch (error) {
    console.error('Error checking jobs:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}