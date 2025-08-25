import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/complete-ttt-canada-order - Complete a TTT Canada order
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (in production you'd validate the auth token)
    const authHeader = request.headers.get('authorization');
    
    // For development, we'll skip strict auth validation
    // In production, implement proper JWT validation here

    const body = await request.json();
    const { orderId, transcription, adminNotes, reviewedBy } = body;

    // Validate required fields
    if (!orderId || !transcription?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: orderId and transcription are required' 
        },
        { status: 400 }
      );
    }

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

    // Check if the order exists
    const jobDoc = await adminDb.collection('ttt_canada_jobs').doc(orderId).get();
    
    if (!jobDoc.exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Order not found',
          message: 'The specified TTT Canada order could not be found'
        },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();
    
    // Update the job with completed transcription and admin notes
    const updateData: any = {
      status: 'completed',
      adminTranscription: transcription.trim(),
      adminNotes: adminNotes?.trim() || '',
      reviewedBy: reviewedBy || 'Admin',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // If there was an existing result, preserve it but add admin transcription
    if (jobData?.result) {
      updateData.result = {
        ...jobData.result,
        adminTranscription: transcription.trim(),
        adminReview: {
          reviewedBy: reviewedBy || 'Admin',
          adminNotes: adminNotes?.trim() || '',
          completedAt: new Date().toISOString()
        }
      };
    } else {
      // Create result object if it doesn't exist
      updateData.result = {
        transcription: transcription.trim(),
        adminTranscription: transcription.trim(),
        status: 'completed',
        adminReview: {
          reviewedBy: reviewedBy || 'Admin',
          adminNotes: adminNotes?.trim() || '',
          completedAt: new Date().toISOString()
        }
      };
    }

    // Update the job document
    await adminDb.collection('ttt_canada_jobs').doc(orderId).update(updateData);

    console.log(`✅ Admin completed TTT Canada order ${orderId} by ${reviewedBy || 'Admin'}`);
    console.log(`📝 Transcription length: ${transcription.length} characters`);
    console.log(`📄 Admin notes: ${adminNotes || 'None'}`);

    // TODO: Send notification to the client
    // This could be email, websocket, push notification, etc.

    return NextResponse.json({
      success: true,
      message: 'TTT Canada order completed successfully',
      orderId,
      completedBy: reviewedBy || 'Admin',
      completedAt: new Date().toISOString(),
      stats: {
        transcriptionLength: transcription.length,
        wordsCount: transcription.split(' ').length,
        hasAdminNotes: !!adminNotes?.trim()
      }
    });

  } catch (error) {
    console.error('Error completing TTT Canada order:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Order not found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Order not found',
            message: 'The specified TTT Canada order could not be found'
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to complete TTT Canada order',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}