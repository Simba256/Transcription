#!/usr/bin/env node

// Simple test to verify Firebase Admin credentials
const admin = require('firebase-admin');
require('dotenv').config({ path: './.env.local' });

console.log('🔧 Testing Firebase Admin Setup\n');

// Check environment variables
console.log('Environment Variables:');
console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('\n❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing');
  process.exit(1);
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('\n❌ FIREBASE_CLIENT_EMAIL is missing');
  process.exit(1);
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error('\n❌ FIREBASE_PRIVATE_KEY is missing');
  process.exit(1);
}

try {
  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('\n✅ Firebase Admin initialized successfully');
  }

  // Test auth service
  const auth = admin.auth();
  console.log('✅ Firebase Auth service accessible');
  console.log('✅ Setup appears to be working correctly');
  
  console.log('\n🎯 Next steps:');
  console.log('1. Start your Next.js app: npm run dev');
  console.log('2. Sign in through the web interface');
  console.log('3. Upload an audio file to test authentication');
  
} catch (error) {
  console.error('\n❌ Firebase Admin setup failed:');
  console.error(error.message);
  
  if (error.message.includes('private_key')) {
    console.error('\n💡 Possible fixes:');
    console.error('1. Make sure FIREBASE_PRIVATE_KEY is properly quoted in .env.local');
    console.error('2. Check that all \\n characters are properly escaped');
    console.error('3. Ensure the private key starts with -----BEGIN PRIVATE KEY-----');
  }
}