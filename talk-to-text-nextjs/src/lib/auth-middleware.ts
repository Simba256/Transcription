import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// Initialize Firebase Admin (server-side)
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
  }
}

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  userProfile?: any;
}

export async function requireAuth(request: NextRequest): Promise<{ 
  success: true; 
  userId: string; 
  userProfile?: any;
} | { 
  success: false; 
  error: NextResponse;
}> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Missing or invalid Authorization header' },
          { status: 401 }
        )
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Optionally get user profile from Firestore
      let userProfile = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          userProfile = userDoc.data();
        }
      } catch (firestoreError) {
        console.warn('Failed to fetch user profile:', firestoreError);
        // Continue without profile - auth is still valid
      }

      return {
        success: true,
        userId,
        userProfile
      };
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Invalid or expired authentication token' },
          { status: 401 }
        )
      };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    };
  }
}

export async function requireOwnership(
  userId: string, 
  resourceType: 'transcription', 
  resourceId: string
): Promise<{ success: true } | { success: false; error: NextResponse }> {
  try {
    if (resourceType === 'transcription') {
      const transcriptionDoc = await getDoc(doc(db, 'transcriptions', resourceId));
      
      if (!transcriptionDoc.exists()) {
        return {
          success: false,
          error: NextResponse.json(
            { error: 'Transcription not found' },
            { status: 404 }
          )
        };
      }

      const transcriptionData = transcriptionDoc.data();
      if (transcriptionData?.userId !== userId) {
        return {
          success: false,
          error: NextResponse.json(
            { error: 'Access denied: You do not own this transcription' },
            { status: 403 }
          )
        };
      }

      return { success: true };
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid resource type' },
        { status: 400 }
      )
    };
  } catch (error) {
    console.error('Ownership check failed:', error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authorization check failed' },
        { status: 500 }
      )
    };
  }
}

export function validateInput(data: Record<string, any>, rules: Record<string, {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}>): { success: true } | { success: false; error: NextResponse } {
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        success: false,
        error: NextResponse.json(
          { error: `Field '${field}' is required` },
          { status: 400 }
        )
      };
    }

    // Skip further validation if field is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type check
    if (rule.type && typeof value !== rule.type) {
      return {
        success: false,
        error: NextResponse.json(
          { error: `Field '${field}' must be of type ${rule.type}` },
          { status: 400 }
        )
      };
    }

    // String length checks
    if (rule.type === 'string' || typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return {
          success: false,
          error: NextResponse.json(
            { error: `Field '${field}' must be at least ${rule.minLength} characters` },
            { status: 400 }
          )
        };
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          success: false,
          error: NextResponse.json(
            { error: `Field '${field}' must be no more than ${rule.maxLength} characters` },
            { status: 400 }
          )
        };
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          success: false,
          error: NextResponse.json(
            { error: `Field '${field}' has invalid format` },
            { status: 400 }
          )
        };
      }
    }
  }

  return { success: true };
}

// Rate limiting (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): { success: true } | { success: false; error: NextResponse } {
  const now = Date.now();
  const key = `${identifier}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { success: true };
  }
  
  if (current.count >= maxRequests) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    };
  }
  
  current.count++;
  return { success: true };
}