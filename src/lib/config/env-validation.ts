/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and properly configured
 */

interface RequiredEnvVars {
  // Firebase Client (Public)
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;

  // Firebase Admin (Private)
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

interface OptionalEnvVars {
  // Optional integrations
  SPEECHMATICS_API_KEY?: string;
  SPEECHMATICS_API_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

type EnvVars = RequiredEnvVars & OptionalEnvVars;

/**
 * Validates that all required environment variables are present
 * @throws Error if any required variables are missing
 */
export function validateEnvironmentVariables(): EnvVars {
  const errors: string[] = [];

  // Check required variables
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate Firebase project consistency
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== process.env.FIREBASE_PROJECT_ID) {
    errors.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID and FIREBASE_PROJECT_ID must match');
  }

  // Validate Firebase private key format
  if (process.env.FIREBASE_PRIVATE_KEY &&
      !process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
    errors.push('FIREBASE_PRIVATE_KEY appears to be malformed (should include "BEGIN PRIVATE KEY")');
  }

  // Validate Firebase client email format
  if (process.env.FIREBASE_CLIENT_EMAIL &&
      !process.env.FIREBASE_CLIENT_EMAIL.includes('@') &&
      !process.env.FIREBASE_CLIENT_EMAIL.includes('.iam.gserviceaccount.com')) {
    errors.push('FIREBASE_CLIENT_EMAIL appears to be malformed (should be a service account email)');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return process.env as EnvVars;
}

/**
 * Gets configuration status for optional services
 */
export function getOptionalServiceStatus() {
  return {
    speechmatics: {
      configured: !!process.env.SPEECHMATICS_API_KEY,
      apiUrl: process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2'
    },
    stripe: {
      configured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
    },
    analytics: {
      configured: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    }
  };
}

/**
 * Safely logs environment status (without exposing secrets)
 */
export function logEnvironmentStatus() {
  const status = getOptionalServiceStatus();

  console.log('[ENV] Environment validation passed ✓');
  console.log('[ENV] Firebase: Configured ✓');
  console.log(`[ENV] Speechmatics: ${status.speechmatics.configured ? 'Configured ✓' : 'Not configured ⚠️'}`);
  console.log(`[ENV] Stripe: ${status.stripe.configured ? 'Configured ✓' : 'Not configured ⚠️'}`);
  console.log(`[ENV] Analytics: ${status.analytics.configured ? 'Configured ✓' : 'Not configured ⚠️'}`);
}

// Validate environment on import (only in Node.js environment)
if (typeof window === 'undefined') {
  try {
    validateEnvironmentVariables();
    logEnvironmentStatus();
  } catch (error) {
    console.error('[ENV] Environment validation failed:', error);
    process.exit(1);
  }
}