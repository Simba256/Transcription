#!/usr/bin/env node

/**
 * Fix subscription fields for existing users
 * This adds includedMinutesPerMonth and minutesUsedThisMonth fields
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore();

// Plan minutes
const PLAN_MINUTES = {
  'ai-starter': 300,
  'ai-professional': 750,
  'ai-enterprise': 1800,
  'hybrid-starter': 300,
  'hybrid-professional': 750,
  'hybrid-enterprise': 1800,
};

async function fixUserSubscriptionFields() {
  try {
    // Get all users with active subscriptions
    const usersSnapshot = await db.collection('users')
      .where('subscriptionStatus', '==', 'active')
      .get();

    console.log(`Found ${usersSnapshot.size} users with active subscriptions`);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const planId = userData.subscriptionPlan;

      if (!planId || !PLAN_MINUTES[planId]) {
        console.log(`Skipping user ${userId}: No plan or unknown plan ${planId}`);
        continue;
      }

      const includedMinutes = PLAN_MINUTES[planId];
      const minutesUsed = userData.currentPeriodMinutesUsed || 0;

      console.log(`Updating user ${userId} (${planId}): ${includedMinutes} minutes included`);

      await db.collection('users').doc(userId).update({
        includedMinutesPerMonth: includedMinutes,
        minutesUsedThisMonth: minutesUsed,
      });

      console.log(`✓ Updated user ${userId}`);
    }

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserSubscriptionFields();
