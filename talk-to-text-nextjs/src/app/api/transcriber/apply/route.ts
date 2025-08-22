import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateInput, rateLimit } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface TranscriberApplication {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  languages: string[];
  specializations: string[];
  portfolioUrl?: string;
  availableHours: number;
  timezone: string;
  whyJoin: string;
  previousWork: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewNotes?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting
    const rateLimitResult = rateLimit(`transcriber-apply-${userId}`, 3, 3600000); // 3 applications per hour
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const body = await request.json();

    // Input validation
    const validationResult = validateInput(body, {
      fullName: { required: true, type: 'string', minLength: 2, maxLength: 100 },
      phone: { required: true, type: 'string', minLength: 10, maxLength: 20 },
      experience: { required: true, type: 'string' },
      whyJoin: { required: true, type: 'string', minLength: 50, maxLength: 1000 },
      previousWork: { required: true, type: 'string', minLength: 50, maxLength: 1000 },
      availableHours: { required: true, type: 'number' },
      timezone: { required: true, type: 'string' }
    });

    if (!validationResult.success) {
      return validationResult.error;
    }

    const {
      fullName,
      phone,
      experience,
      languages = [],
      specializations = [],
      portfolioUrl,
      availableHours,
      timezone,
      whyJoin,
      previousWork
    } = body;

    // Check if user already has an application
    const existingAppDoc = await getDoc(doc(db, 'transcriber_applications', userId));
    if (existingAppDoc.exists()) {
      const existingApp = existingAppDoc.data();
      if (existingApp.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending application' },
          { status: 400 }
        );
      } else if (existingApp.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already an approved transcriber' },
          { status: 400 }
        );
      }
    }

    // Create application
    const applicationData: TranscriberApplication = {
      userId,
      fullName,
      email: authResult.userProfile?.email || '',
      phone,
      experience,
      languages: Array.isArray(languages) ? languages : [],
      specializations: Array.isArray(specializations) ? specializations : [],
      portfolioUrl: portfolioUrl || undefined,
      availableHours,
      timezone,
      whyJoin,
      previousWork,
      status: 'pending',
      submittedAt: serverTimestamp()
    };

    // Save to Firestore
    await setDoc(doc(db, 'transcriber_applications', userId), applicationData);

    // Update user profile with application status
    await setDoc(doc(db, 'users', userId), {
      transcriberApplication: {
        status: 'pending',
        submittedAt: serverTimestamp()
      }
    }, { merge: true });

    // TODO: Send notification email to admin
    // TODO: Add to review queue

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: userId
    });

  } catch (error) {
    console.error('Transcriber application error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Application submission failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Get user's application status
    const appDoc = await getDoc(doc(db, 'transcriber_applications', userId));
    
    if (!appDoc.exists()) {
      return NextResponse.json({
        success: true,
        hasApplication: false,
        status: null
      });
    }

    const application = appDoc.data();
    
    return NextResponse.json({
      success: true,
      hasApplication: true,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
      reviewNotes: application.reviewNotes
    });

  } catch (error) {
    console.error('Get application status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get application status' },
      { status: 500 }
    );
  }
}