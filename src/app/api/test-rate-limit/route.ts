import { NextRequest, NextResponse } from 'next/server';
import { createRateLimit } from '@/lib/middleware/rate-limit';

// Create a very strict rate limiter for testing
const testRateLimit = createRateLimit({
  maxRequests: 2,
  windowMs: 10000, // 10 seconds
});

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await testRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return NextResponse.json({
    message: 'Request allowed',
    timestamp: new Date().toISOString()
  });
}