import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    return NextResponse.json({ 
      authenticated: true, 
      uid: decodedToken.uid,
      email: decodedToken.email 
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}