/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiting for development (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  identifier?: (req: NextRequest) => string; // Custom identifier function
  skipIf?: (req: NextRequest) => boolean; // Skip rate limiting if condition is true
  onLimit?: (req: NextRequest) => NextResponse; // Custom response when rate limited
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  // Critical endpoints - strict limits
  transcription: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  billing: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // Authentication endpoints - moderate limits
  auth: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },

  // Admin endpoints - moderate limits with user-based tracking
  admin: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },

  // General API endpoints - generous limits
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  }
} as const;

/**
 * Default identifier function - uses IP address and user agent
 */
function defaultIdentifier(req: NextRequest): string {
  const ip = req.ip ||
             req.headers.get('x-forwarded-for')?.split(',')[0] ||
             req.headers.get('x-real-ip') ||
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent.slice(0, 50)}`; // Limit user agent length
}

/**
 * User-based identifier for authenticated requests
 */
export function userBasedIdentifier(req: NextRequest): string {
  // Try to get user ID from cookie or header
  const authToken = req.cookies.get('auth-token')?.value;
  if (authToken) {
    // Use first part of JWT token as identifier (not secure but sufficient for rate limiting)
    const tokenPart = authToken.split('.')[0];
    return `user:${tokenPart}`;
  }
  return defaultIdentifier(req);
}

/**
 * IP-based identifier for public endpoints
 */
export function ipBasedIdentifier(req: NextRequest): string {
  return defaultIdentifier(req);
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware function
 */
export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
    // Skip rate limiting if condition is met
    if (config.skipIf && config.skipIf(req)) {
      return null;
    }

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      cleanupExpiredEntries();
    }

    const identifier = config.identifier ? config.identifier(req) : defaultIdentifier(req);
    const now = Date.now();
    const resetTime = now + config.windowMs;

    const current = rateLimitStore.get(identifier);

    if (!current || now > current.resetTime) {
      // First request or window expired
      rateLimitStore.set(identifier, { count: 1, resetTime });
      return null; // Allow request
    }

    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      const timeToReset = Math.ceil((current.resetTime - now) / 1000);

      console.warn(`[RATE_LIMIT] Rate limit exceeded for ${identifier} on ${req.nextUrl.pathname}`);

      if (config.onLimit) {
        return config.onLimit(req);
      }

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${timeToReset} seconds.`,
          retryAfter: timeToReset
        },
        {
          status: 429,
          headers: {
            'Retry-After': timeToReset.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          }
        }
      );
    }

    // Increment count
    current.count++;
    rateLimitStore.set(identifier, current);

    return null; // Allow request
  };
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  transcription: createRateLimit({
    ...RATE_LIMIT_CONFIGS.transcription,
    identifier: userBasedIdentifier
  }),

  billing: createRateLimit({
    ...RATE_LIMIT_CONFIGS.billing,
    identifier: userBasedIdentifier
  }),

  auth: createRateLimit({
    ...RATE_LIMIT_CONFIGS.auth,
    identifier: ipBasedIdentifier
  }),

  admin: createRateLimit({
    ...RATE_LIMIT_CONFIGS.admin,
    identifier: userBasedIdentifier
  }),

  general: createRateLimit({
    ...RATE_LIMIT_CONFIGS.general,
    identifier: ipBasedIdentifier
  })
};

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function withRateLimit<T extends any[]>(
  rateLimiter: ReturnType<typeof createRateLimit>,
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async function rateLimitedHandler(req: NextRequest, ...args: T): Promise<NextResponse> {
    const rateLimitResponse = await rateLimiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(req, ...args);
  };
}

/**
 * Utility to get current rate limit status for a request
 */
export function getRateLimitStatus(req: NextRequest, config: RateLimitConfig): {
  remaining: number;
  resetTime: number;
  limited: boolean;
} {
  const identifier = config.identifier ? config.identifier(req) : defaultIdentifier(req);
  const current = rateLimitStore.get(identifier);
  const now = Date.now();

  if (!current || now > current.resetTime) {
    return {
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
      limited: false
    };
  }

  return {
    remaining: Math.max(0, config.maxRequests - current.count),
    resetTime: current.resetTime,
    limited: current.count >= config.maxRequests
  };
}