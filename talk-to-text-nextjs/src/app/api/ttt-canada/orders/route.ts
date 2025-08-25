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

    // Import Firebase functions
    const { db } = await import('@/lib/firebase');
    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const statusFilter = searchParams.get('status');

    // Build query
    let ordersQuery = query(
      collection(db, 'ttt_canada_jobs'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(Math.min(limitParam, 100)) // Max 100 orders
    );

    // Add status filter if provided
    if (statusFilter && ['processing', 'ai_processing', 'pending_human_review', 'completed', 'failed'].includes(statusFilter)) {
      const { where: whereClause } = await import('firebase/firestore');
      ordersQuery = query(
        collection(db, 'ttt_canada_jobs'),
        where('userId', '==', userId),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(Math.min(limitParam, 100))
      );
    }

    // Execute query
    const querySnapshot = await getDocs(ordersQuery);
    
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
    console.error('TTT Canada orders fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
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

    // Import Firebase functions
    const { db } = await import('@/lib/firebase');
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

    // Update job status
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (data) {
      Object.assign(updateData, data);
    }

    await updateDoc(doc(db, 'ttt_canada_jobs', jobId), updateData);

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