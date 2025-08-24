import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/complete-ttt-canada-order - Complete a TTT Canada order
export async function POST(request: NextRequest) {
  try {
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

    // For now, we'll simulate the completion process
    // In production, this would:
    // 1. Update the TTT Canada order in the database
    // 2. Store the completed transcription
    // 3. Update the order status to 'completed'
    // 4. Send notification to the client
    // 5. Process payment if needed

    console.log(`✅ Admin completed TTT Canada order ${orderId} by ${reviewedBy || 'Admin'}`);
    console.log(`📝 Transcription length: ${transcription.length} characters`);
    console.log(`📄 Admin notes: ${adminNotes || 'None'}`);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

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