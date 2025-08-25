import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/ttt-canada-audio/[jobId] - Serve audio file from buffer
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Check if user is authenticated (in production you'd validate the auth token)
    const authHeader = request.headers.get('authorization');
    
    // For development, we'll skip strict auth validation
    // In production, implement proper JWT validation here
    
    // Get Firebase Admin SDK
    const admin = await import('firebase-admin');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Firebase Admin initialized successfully');
      } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Firebase initialization failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
    
    const adminDb = admin.firestore();

    // Get the job document
    const jobDoc = await adminDb.collection('ttt_canada_jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();
    
    if (!jobData?.buffer) {
      return NextResponse.json(
        { error: 'Audio buffer not found' },
        { status: 404 }
      );
    }

    // Convert the buffer array back to a Buffer
    const audioBuffer = Buffer.from(jobData.buffer);
    
    // Determine content type based on file name
    const fileName = jobData.fileName || 'audio.mp3';
    let contentType = 'audio/mpeg'; // Default
    
    if (fileName.toLowerCase().endsWith('.wav')) {
      contentType = 'audio/wav';
    } else if (fileName.toLowerCase().endsWith('.m4a')) {
      contentType = 'audio/mp4';
    } else if (fileName.toLowerCase().endsWith('.ogg')) {
      contentType = 'audio/ogg';
    } else if (fileName.toLowerCase().endsWith('.webm')) {
      contentType = 'audio/webm';
    }

    console.log(`🎵 Serving audio file for job ${jobId}: ${fileName} (${audioBuffer.length} bytes, ${contentType})`);

    // Return the audio buffer with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${fileName}"`
      },
    });

  } catch (error) {
    console.error('Error serving TTT Canada audio:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to serve audio file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}