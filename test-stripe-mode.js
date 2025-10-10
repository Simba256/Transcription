// Quick test script to verify Stripe keys
console.log('Checking Stripe keys from environment...');
console.log('Public Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('Is Test Mode?:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('pk_test'));

// Run this with: node test-stripe-mode.js