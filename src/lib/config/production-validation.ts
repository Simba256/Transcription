/**
 * Production Environment Validation
 * Ensures all required environment variables are configured for production
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Only validate in production
  if (process.env.NODE_ENV !== 'production') {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Required Firebase Configuration
  const requiredFirebaseVars = [
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

  requiredFirebaseVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required Firebase variable: ${varName}`);
    }
  });

  // Required Stripe Configuration
  const requiredStripeVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  requiredStripeVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required Stripe variable: ${varName}`);
    }
  });

  // Validate Stripe keys are production keys
  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
    errors.push('STRIPE_SECRET_KEY is a test key. Production requires live keys.');
  }
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test')) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a test key. Production requires live keys.');
  }

  // Check for Stripe pricing tables (warning if missing)
  const pricingTableVars = [
    'NEXT_PUBLIC_STRIPE_PRICING_TABLE_AI',
    'NEXT_PUBLIC_STRIPE_PRICING_TABLE_HYBRID',
    'NEXT_PUBLIC_STRIPE_PRICING_TABLE_HUMAN'
  ];

  pricingTableVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Missing Stripe pricing table: ${varName} - Pricing tables will not display`);
    }
  });

  // Check for wallet payment links (warning if missing)
  const walletLinkVars = [
    'NEXT_PUBLIC_STRIPE_WALLET_LINK_50',
    'NEXT_PUBLIC_STRIPE_WALLET_LINK_200',
    'NEXT_PUBLIC_STRIPE_WALLET_LINK_500'
  ];

  walletLinkVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Missing wallet payment link: ${varName} - Wallet top-ups will not work`);
    }
  });

  // Required Application Configuration
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    errors.push('Missing NEXT_PUBLIC_APP_URL - Required for webhooks and share links');
  } else if (process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    errors.push('NEXT_PUBLIC_APP_URL contains localhost - Must be production domain');
  }

  // Check for test payment route (should not exist in production)
  if (process.env.NODE_ENV === 'production') {
    // This is handled by the route itself, but we can warn about it
    warnings.push('Ensure /api/test-payment route is disabled in production build');
  }

  // Optional but recommended
  if (!process.env.SPEECHMATICS_API_KEY) {
    warnings.push('SPEECHMATICS_API_KEY not configured - AI transcription will be limited');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings
  };
}

/**
 * Log validation results to console
 */
export function logValidationResults(result: ValidationResult) {
  if (!result.isValid) {
    console.error('❌ PRODUCTION ENVIRONMENT VALIDATION FAILED');
    console.error('The following errors must be fixed before deploying to production:\n');
    result.errors.forEach(error => {
      console.error(`  • ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  PRODUCTION WARNINGS:');
    result.warnings.forEach(warning => {
      console.warn(`  • ${warning}`);
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Production environment validation passed');
  }
}

/**
 * Run validation and throw error if critical issues found
 * Call this during app initialization
 */
export function validateProductionOrThrow() {
  const result = validateProductionEnvironment();
  logValidationResults(result);

  if (!result.isValid) {
    throw new Error(
      'Production environment validation failed. Please check the console for details.'
    );
  }
}