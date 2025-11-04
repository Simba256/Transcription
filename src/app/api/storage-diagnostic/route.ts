import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase/config';

export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      firebaseConfig: {
        storageBucket: storage.app.options.storageBucket || 'NOT CONFIGURED',
        projectId: storage.app.options.projectId || 'NOT CONFIGURED',
        apiKey: storage.app.options.apiKey ? '✓ Configured' : '✗ Missing',
        authDomain: storage.app.options.authDomain || 'NOT CONFIGURED',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        storageEmulator: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'Not using emulator',
      },
      status: 'Configuration loaded successfully'
    };

    // Check if storage bucket is configured
    if (!storage.app.options.storageBucket) {
      return NextResponse.json({
        error: 'Storage bucket not configured',
        message: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing or empty',
        diagnostics
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Firebase Storage configuration is valid',
      diagnostics
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Firebase Storage diagnostic failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
