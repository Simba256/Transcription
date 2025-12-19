import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Health check endpoint for monitoring
 * GET /api/health
 *
 * Returns:
 * - 200: All systems operational
 * - 503: Service unavailable
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Check 1: Database connectivity
    try {
      const testDoc = await adminDb.collection('_health').doc('test').get();
      checks.checks.database = { status: 'ok', message: 'Firestore accessible' };
    } catch (error) {
      checks.checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      checks.status = 'degraded';
    }

    // Check 2: Environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_PROJECT_ID',
      'STRIPE_SECRET_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

    if (missingEnvVars.length > 0) {
      checks.checks.environment = {
        status: 'error',
        missing: missingEnvVars
      };
      checks.status = 'degraded';
    } else {
      checks.checks.environment = { status: 'ok' };
    }

    // Check 3: Next.js version
    checks.checks.nextjs = {
      version: process.env.npm_package_version || 'unknown',
      runtime: 'nodejs',
      status: 'ok'
    };

    // Overall status
    const hasErrors = Object.values(checks.checks).some(
      (check: any) => check.status === 'error'
    );

    if (hasErrors) {
      return NextResponse.json(checks, { status: 503 });
    }

    return NextResponse.json(checks, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 503 });
  }
}
