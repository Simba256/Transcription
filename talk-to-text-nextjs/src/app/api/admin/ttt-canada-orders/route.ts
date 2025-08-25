import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/ttt-canada-orders - Get TTT Canada orders for admin management
export async function GET(request: NextRequest) {
  try {
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

    // Query TTT Canada jobs from Firestore
    console.log('🔍 Querying ttt_canada_jobs collection...');
    const jobsSnapshot = await adminDb
      .collection('ttt_canada_jobs')
      .orderBy('createdAt', 'desc')
      .limit(100) // Limit for performance
      .get();

    console.log(`📊 Found ${jobsSnapshot.docs.length} TTT Canada jobs in database`);

    // If no real jobs found, add some mock data for testing the interface
    if (jobsSnapshot.docs.length === 0) {
      console.log('🧪 No TTT Canada jobs found, adding mock data for testing');
      const mockOrders = [
        {
          id: 'mock-ttt-001',
          userId: 'mock_user_123',
          fileName: 'test_audio.mp3',
          fileUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3', // A working audio URL
          fileSize: 1024000,
          duration: 120,
          serviceType: 'ai_human_review',
          status: 'queued_for_admin',
          priority: 'normal',
          language: 'en',
          pricing: {
            basePrice: 35.0,
            totalCAD: 40.5,
            addOns: [
              { name: 'Timestamps', price: 5.5 }
            ]
          },
          clientInstructions: 'Please format according to standard transcription guidelines.',
          specialRequirements: 'Include speaker identification',
          aiTranscript: 'This is a sample AI-generated transcript that would normally come from the processing system. It contains the initial transcription that admins can use as a starting point.',
          confidence: 0.85,
          createdAt: { toDate: () => new Date() },
          completedAt: null
        }
      ];

      return NextResponse.json({
        success: true,
        orders: mockOrders,
        stats: {
          pending: 1,
          processing: 0,
          completed: 0,
          total: 1,
          totalRevenue: 0
        },
        message: 'Mock TTT Canada orders for testing (no real orders found)'
      });
    }

    const orders = await Promise.all(
      jobsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Map Firestore job data to admin order format
        console.log(`🔍 Debug TTT Canada order ${data.jobId}:`, {
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          hasBuffer: !!data.buffer,
          status: data.status,
          hasResult: !!data.result
        });

        // Handle buffer-based files vs URL-based files
        let audioUrl = data.fileUrl;
        if (data.fileUrl && data.fileUrl.startsWith('buffer:') && data.buffer) {
          // Convert buffer array to blob URL for audio playback
          try {
            const bufferArray = new Uint8Array(data.buffer);
            audioUrl = `/api/admin/ttt-canada-audio/${data.jobId || doc.id}`;
          } catch (error) {
            console.error('Error processing buffer for audio:', error);
            audioUrl = data.fileUrl; // Fallback to original
          }
        }

        const order: any = {
          id: data.jobId || doc.id,
          userId: data.userId,
          fileName: data.fileName,
          fileUrl: audioUrl,
          fileSize: data.fileSize,
          duration: data.duration,
          serviceType: data.serviceType,
          status: mapJobStatusToOrderStatus(data.status),
          priority: determinePriority(data),
          language: data.config?.language || 'en',
          pricing: {
            basePrice: data.pricing?.basePrice || 0,
            totalCAD: data.pricing?.totalCAD || 0,
            addOns: mapAddOns(data.pricing?.addOnPrices || {})
          },
          clientInstructions: data.config?.clientInstructions,
          specialRequirements: data.config?.specialRequirements,
          adminTranscription: data.adminTranscription || data.result?.adminTranscription,
          adminNotes: data.adminNotes,
          // AI transcript fields for manual transcriptions compatibility
          aiTranscript: data.result?.transcription || data.result?.baseTranscript,
          confidence: data.result?.confidence || data.result?.metadata?.confidenceScore,
          createdAt: data.createdAt,
          completedAt: data.completedAt ? (typeof data.completedAt === 'string' ? 
            { toDate: () => new Date(data.completedAt) } : data.completedAt) : null
        };

        return order;
      })
    );

    // Filter orders based on query params if needed
    const status = request.nextUrl.searchParams.get('status');
    const filteredOrders = status 
      ? orders.filter(order => order.status === status)
      : orders;

    // Calculate stats
    const stats = {
      pending: orders.filter(o => ['pending', 'queued_for_admin'].includes(o.status)).length,
      processing: orders.filter(o => o.status === 'processing').length,
      completed: orders.filter(o => o.status === 'completed').length,
      total: orders.length,
      totalRevenue: orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.pricing?.totalCAD || 0), 0)
    };

    return NextResponse.json({
      success: true,
      orders: filteredOrders,
      stats,
      message: 'TTT Canada orders retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching TTT Canada orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch TTT Canada orders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Map job status from Firestore to admin order status
 */
function mapJobStatusToOrderStatus(jobStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'pending',
    'processing': 'processing',
    'ai_processing': 'processing',
    'pending_human_review': 'queued_for_admin',
    'human_review': 'processing',
    'completed': 'completed',
    'failed': 'pending' // Show failed jobs as pending for admin review
  };
  
  return statusMap[jobStatus] || 'pending';
}

/**
 * Determine priority based on job data
 */
function determinePriority(jobData: any): string {
  // Check for rush delivery add-on
  if (jobData.config?.addOns?.rushDelivery) {
    return 'urgent';
  }
  
  // Check service type priority
  if (jobData.serviceType === 'legal_dictation') {
    return 'high';
  }
  
  if (jobData.serviceType === 'indigenous_oral') {
    return 'high'; // Cultural content gets high priority
  }
  
  // Check file size/duration for complexity
  if (jobData.duration && jobData.duration > 3600) { // Over 1 hour
    return 'normal';
  }
  
  return 'normal';
}

/**
 * Map add-on prices to add-on objects
 */
function mapAddOns(addOnPrices: { [key: string]: number }): Array<{ name: string; price: number }> {
  const addOnNames: { [key: string]: string } = {
    'timestamps': 'Timestamps',
    'anonymization': 'Anonymization',
    'customTemplate': 'Custom Template',
    'rushDelivery': 'Rush Service'
  };
  
  return Object.entries(addOnPrices).map(([key, price]) => ({
    name: addOnNames[key] || key,
    price: price
  }));
}