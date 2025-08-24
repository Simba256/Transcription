import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/ttt-canada-orders - Get TTT Canada orders for admin management
export async function GET(request: NextRequest) {
  try {
    // For now, return mock data since we haven't fully integrated TTT Canada with the database
    // In production, this would query the actual TTT Canada orders from Firestore
    
    const mockOrders = [
      {
        id: 'ttt-001',
        userId: 'user_123',
        fileName: 'legal_consultation_2025.mp3',
        fileUrl: '/mock-audio/legal-consultation.mp3',
        fileSize: 15432109,
        duration: 1800, // 30 minutes
        serviceType: 'legal_dictation',
        status: 'queued_for_admin',
        priority: 'high',
        language: 'en',
        pricing: {
          basePrice: 55.5, // 30 min * $1.85 CAD
          totalCAD: 70.5,
          addOns: [
            { name: 'Timestamps', price: 7.5 },
            { name: 'Rush Service', price: 15.0 }
          ]
        },
        clientInstructions: 'Please format according to Ontario legal standards. Client is a personal injury case requiring precise legal terminology.',
        specialRequirements: 'PIPEDA compliance required - anonymize all personal identifiers',
        createdAt: { toDate: () => new Date('2025-08-23T10:30:00Z') },
        completedAt: null
      },
      {
        id: 'ttt-002',
        userId: 'user_456',
        fileName: 'elder_storytelling_session.wav',
        fileUrl: '/mock-audio/elder-story.wav',
        fileSize: 28965432,
        duration: 2700, // 45 minutes
        serviceType: 'indigenous_oral',
        status: 'processing',
        priority: 'normal',
        language: 'en',
        pricing: {
          basePrice: 112.5, // 45 min * $2.50 CAD
          totalCAD: 112.5,
          addOns: []
        },
        clientInstructions: 'This is a traditional Anishinaabe storytelling session. Please preserve the natural flow and rhythm of the oral tradition.',
        specialRequirements: 'Cultural sensitivity required - this contains traditional knowledge and sacred stories',
        createdAt: { toDate: () => new Date('2025-08-23T08:15:00Z') },
        completedAt: null
      },
      {
        id: 'ttt-003',
        userId: 'user_789',
        fileName: 'academic_interview_transcript.m4a',
        fileUrl: '/mock-audio/academic-interview.m4a',
        fileSize: 12345678,
        duration: 3600, // 60 minutes
        serviceType: 'ai_human_review',
        status: 'completed',
        priority: 'normal',
        language: 'en',
        pricing: {
          basePrice: 105.0, // 60 min * $1.75 CAD
          totalCAD: 120.0,
          addOns: [
            { name: 'Timestamps', price: 15.0 }
          ]
        },
        clientInstructions: 'Academic research interview for PhD thesis. Requires professional formatting.',
        adminTranscription: 'The interview covered various aspects of Canadian healthcare policy...',
        adminNotes: 'Completed with high accuracy. Some technical terminology clarified.',
        createdAt: { toDate: () => new Date('2025-08-22T14:20:00Z') },
        completedAt: { toDate: () => new Date('2025-08-23T09:45:00Z') }
      },
      {
        id: 'ttt-004',
        userId: 'user_321',
        fileName: 'board_meeting_minutes.mp3',
        fileUrl: '/mock-audio/board-meeting.mp3',
        fileSize: 18976543,
        duration: 4800, // 80 minutes
        serviceType: 'verbatim_multispeaker',
        status: 'queued_for_admin',
        priority: 'urgent',
        language: 'en',
        pricing: {
          basePrice: 180.0, // 80 min * $2.25 CAD
          totalCAD: 220.0,
          addOns: [
            { name: 'Rush Service', price: 40.0 }
          ]
        },
        clientInstructions: 'Corporate board meeting with 8 speakers. Need exact verbatim with all filler words and interruptions.',
        specialRequirements: 'Confidential - NDA signed. Board members must be identified clearly.',
        createdAt: { toDate: () => new Date('2025-08-23T11:00:00Z') },
        completedAt: null
      }
    ];

    // Filter orders based on query params if needed
    const status = request.nextUrl.searchParams.get('status');
    const filteredOrders = status 
      ? mockOrders.filter(order => order.status === status)
      : mockOrders;

    // Calculate stats
    const stats = {
      pending: mockOrders.filter(o => ['pending', 'queued_for_admin'].includes(o.status)).length,
      processing: mockOrders.filter(o => o.status === 'processing').length,
      completed: mockOrders.filter(o => o.status === 'completed').length,
      total: mockOrders.length,
      totalRevenue: mockOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.pricing.totalCAD, 0)
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