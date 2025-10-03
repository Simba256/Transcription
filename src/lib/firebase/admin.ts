import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { validateEnvironmentVariables } from '../config/env-validation';

if (!getApps().length) {
  // Validate environment variables before initializing
  const env = validateEnvironmentVariables();

  // Handle private key formatting for both local and Docker environments
  let privateKey = env.FIREBASE_PRIVATE_KEY;

  // Remove quotes if present (Docker environment issue)
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  // Handle both escaped newlines (\n) and literal newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  // Additional validation that the key is properly formatted
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('FIREBASE_PRIVATE_KEY is malformed - missing BEGIN/END markers');
  }

  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID}.appspot.com`,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();