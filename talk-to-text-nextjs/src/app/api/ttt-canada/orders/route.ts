import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Use Firebase Admin SDK for server-side operations
    const admin = await import('firebase-admin');
    const adminDb = admin.firestore();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const statusFilter = searchParams.get('status');

    // Build simple query using Admin SDK
    console.log(`📋 Building query for user ${userId}, status filter: ${statusFilter}`);
    
    let ordersQuery = adminDb.collection('ttt_canada_jobs').where('userId', '==', userId);
    
    if (statusFilter && ['processing', 'ai_processing', 'pending_human_review', 'completed', 'failed'].includes(statusFilter)) {
      // Add status filter
      ordersQuery = ordersQuery.where('status', '==', statusFilter);
    }
    
    // Limit results
    ordersQuery = ordersQuery.limit(Math.min(limitParam, 100));

    // Execute query
    console.log('🔍 Executing Firestore query...');
    const querySnapshot = await ordersQuery.get();
    console.log(`📊 Query returned ${querySnapshot.docs.length} documents`);
    
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamps to ISO strings
      const order = {
        ...data,
        id: doc.id,
        jobId: data.jobId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        aiDraftCompletedAt: data.aiDraftCompletedAt?.toDate?.()?.toISOString() || data.aiDraftCompletedAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt
      };
      
      return order;
    });

    console.log(`📋 Retrieved ${orders.length} TTT Canada orders for user ${userId}`);

    return NextResponse.json({
      success: true,
      orders,
      total: orders.length,
      hasMore: orders.length === limitParam
    });

  } catch (error) {
    console.error('❌ TTT Canada orders fetch error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: POST endpoint to update order status (for admin use)
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const { jobId, status, data } = body;

    if (!jobId || !status) {
      return NextResponse.json(
        { error: 'jobId and status are required' },
        { status: 400 }
      );
    }

    // Use Firebase Admin SDK for server-side operations
    const admin = await import('firebase-admin');
    const adminDb = admin.firestore();

    // Update job status
    const updateData: any = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (data) {
      Object.assign(updateData, data);
    }

    await adminDb.collection('ttt_canada_jobs').doc(jobId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('TTT Canada order update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update order' },
      { status: 500 }
    );
  }
}