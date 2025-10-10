#!/usr/bin/env node
/**
 * Migration Script: Credits to Wallet System
 *
 * This script migrates existing users from the old credit system to the new wallet/package system.
 * Run with: node scripts/migrate-to-wallet-system.js
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Configuration
const CREDIT_TO_DOLLAR_RATIO = 100; // 100 credits = $1 CAD
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500; // Firestore batch limit

console.log(`
========================================
WALLET SYSTEM MIGRATION
========================================
Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}
Credit Conversion: 100 credits = CA$1.00
========================================
`);

async function migrateUsers() {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    console.log(`Found ${totalUsers} users to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalCreditsConverted = 0;
    let totalWalletAdded = 0;

    // Process in batches
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();

      // Skip if already migrated
      if (userData._walletMigrated) {
        console.log(`✓ User ${userId} already migrated - skipping`);
        skippedCount++;
        continue;
      }

      // Calculate new wallet balance
      const currentCredits = userData.credits || 0;
      const existingWallet = userData.walletBalance || 0;
      const creditsAsDollars = currentCredits / CREDIT_TO_DOLLAR_RATIO;
      const newWalletBalance = existingWallet + creditsAsDollars;

      // Initialize packages array if not exists
      const packages = userData.packages || [];

      // Migration data
      const updateData = {
        walletBalance: newWalletBalance,
        credits: 0, // Clear old credits
        packages: packages, // Ensure packages array exists
        _walletMigrated: true,
        _migrationDate: admin.firestore.FieldValue.serverTimestamp(),
        _previousCredits: currentCredits, // Store for audit
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would migrate user ${userId}:`);
        console.log(`  - Credits: ${currentCredits} → CA$${creditsAsDollars.toFixed(2)}`);
        console.log(`  - Existing wallet: CA$${existingWallet.toFixed(2)}`);
        console.log(`  - New wallet balance: CA$${newWalletBalance.toFixed(2)}`);
      } else {
        currentBatch.update(doc.ref, updateData);
        operationCount++;

        console.log(`✓ Migrating user ${userId}:`);
        console.log(`  - Credits: ${currentCredits} → CA$${creditsAsDollars.toFixed(2)}`);
        console.log(`  - New wallet: CA$${newWalletBalance.toFixed(2)}`);

        // Track totals
        totalCreditsConverted += currentCredits;
        totalWalletAdded += creditsAsDollars;

        // If batch is full, add to batches array and create new batch
        if (operationCount >= BATCH_SIZE) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }
      }

      migratedCount++;
    }

    // Add remaining batch if it has operations
    if (operationCount > 0 && !DRY_RUN) {
      batches.push(currentBatch);
    }

    // Execute all batches
    if (!DRY_RUN && batches.length > 0) {
      console.log(`\nExecuting ${batches.length} batch(es)...`);

      for (let i = 0; i < batches.length; i++) {
        try {
          await batches[i].commit();
          console.log(`✓ Batch ${i + 1}/${batches.length} committed`);
        } catch (error) {
          console.error(`✗ Batch ${i + 1}/${batches.length} failed:`, error.message);
          errorCount++;
        }
      }
    }

    // Create migration record
    if (!DRY_RUN && migratedCount > 0) {
      await db.collection('system_migrations').add({
        type: 'credits_to_wallet',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        stats: {
          totalUsers: totalUsers,
          migratedUsers: migratedCount,
          skippedUsers: skippedCount,
          errors: errorCount,
          totalCreditsConverted: totalCreditsConverted,
          totalWalletAdded: totalWalletAdded,
          averageConversion: totalWalletAdded / Math.max(1, migratedCount)
        }
      });
    }

    // Summary
    console.log(`
========================================
MIGRATION SUMMARY
========================================
Total users:        ${totalUsers}
Migrated:          ${migratedCount}
Already migrated:   ${skippedCount}
Errors:            ${errorCount}
----------------------------------------
Credits converted:  ${totalCreditsConverted}
Wallet added:      CA$${totalWalletAdded.toFixed(2)}
Average per user:  CA$${(totalWalletAdded / Math.max(1, migratedCount)).toFixed(2)}
========================================
${DRY_RUN ? 'DRY RUN COMPLETE - No changes made' : 'MIGRATION COMPLETE'}
`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });