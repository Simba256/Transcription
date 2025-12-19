/**
 * Script to manually check a user's packages and wallet balance in Firebase
 * Usage: node scripts/check-user-packages.js <email>
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function checkUserPackages(email) {
  try {
    console.log(`\n🔍 Searching for user: ${email}\n`);

    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ User not found with email:', email);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('✅ User found!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USER INFORMATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${userData.email}`);
    console.log(`Name: ${userData.displayName || 'N/A'}`);
    console.log(`Role: ${userData.role || 'user'}`);
    console.log(`Created: ${userData.createdAt?.toDate().toLocaleString() || 'N/A'}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 WALLET & BALANCE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Wallet Balance: CA$${(userData.walletBalance || 0).toFixed(2)}`);
    console.log(`Free Trial Minutes: ${userData.freeTrialMinutes || 0}`);
    console.log(`Free Trial Active: ${userData.freeTrialActive ? 'Yes ✓' : 'No ✗'}`);
    console.log(`Free Trial Used: ${userData.freeTrialMinutesUsed || 0}/${userData.freeTrialMinutesTotal || 0}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 PURCHASED PACKAGES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const packages = userData.packages || [];

    if (packages.length === 0) {
      console.log('❌ No packages found');
      console.log('\n⚠️  ISSUE: User has no packages in their account');
      console.log('   This means either:');
      console.log('   1. The webhook never processed the payment');
      console.log('   2. The Stripe session metadata was missing');
      console.log('   3. The Firestore transaction failed');
    } else {
      console.log(`Total packages: ${packages.length}\n`);

      const now = new Date();
      packages.forEach((pkg, index) => {
        const isExpired = new Date(pkg.expiresAt?.toDate() || 0) < now;
        const hasMinutes = pkg.minutesRemaining > 0;
        const isActive = pkg.active && !isExpired && hasMinutes;

        console.log(`Package ${index + 1}:`);
        console.log(`  ID: ${pkg.id}`);
        console.log(`  Name: ${pkg.name}`);
        console.log(`  Type: ${pkg.type}`);
        console.log(`  Status: ${isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
        console.log(`  Minutes Total: ${pkg.minutesTotal}`);
        console.log(`  Minutes Used: ${pkg.minutesUsed}`);
        console.log(`  Minutes Remaining: ${pkg.minutesRemaining} ${hasMinutes ? '✓' : '✗ (depleted)'}`);
        console.log(`  Rate: CA$${pkg.rate}/minute`);
        console.log(`  Purchased: ${pkg.purchasedAt?.toDate().toLocaleString() || 'N/A'}`);
        console.log(`  Expires: ${pkg.expiresAt?.toDate().toLocaleString() || 'N/A'} ${isExpired ? '✗ (expired)' : '✓'}`);
        console.log(`  Active Flag: ${pkg.active ? 'true' : 'false'}`);
        console.log(`  Session ID: ${pkg.sessionId || 'N/A'}`);
        console.log('');
      });

      const activePackages = packages.filter(pkg => {
        const isExpired = new Date(pkg.expiresAt?.toDate() || 0) < now;
        return pkg.active && !isExpired && pkg.minutesRemaining > 0;
      });

      console.log(`\nSummary: ${activePackages.length} active package(s) with minutes remaining`);
    }

    // Check recent transactions
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RECENT TRANSACTIONS (Last 10):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const transactionsSnapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (transactionsSnapshot.empty) {
      console.log('❌ No transactions found');
      console.log('\n⚠️  WARNING: No transactions means:');
      console.log('   1. User never completed a purchase, OR');
      console.log('   2. Webhook never created transaction records');
    } else {
      console.log(`Total: ${transactionsSnapshot.size} transactions\n`);

      transactionsSnapshot.docs.forEach((doc, index) => {
        const tx = doc.data();
        const date = tx.createdAt?.toDate().toLocaleString() || 'N/A';
        const typeEmoji = tx.type === 'package_purchase' ? '📦' :
                         tx.type === 'wallet_topup' ? '💰' :
                         tx.type === 'transcription' ? '🎙️' : '📄';

        console.log(`${index + 1}. ${typeEmoji} ${tx.type.toUpperCase()}`);
        console.log(`   Date: ${date}`);
        console.log(`   Description: ${tx.description}`);

        if (tx.type === 'package_purchase') {
          console.log(`   Package Minutes: ${tx.packageMinutes || tx.amount}`);
          console.log(`   Package ID: ${tx.packageId || 'N/A'}`);
          console.log(`   Session ID: ${tx.sessionId || 'N/A'}`);
        } else if (tx.type === 'wallet_topup') {
          console.log(`   Amount: CA$${tx.amount.toFixed(2)}`);
          console.log(`   Session ID: ${tx.sessionId || 'N/A'}`);
        } else if (tx.type === 'transcription') {
          console.log(`   Cost: CA$${Math.abs(tx.amount).toFixed(2)}`);
          console.log(`   Minutes: ${tx.minutesUsed || 0}`);
          console.log(`   Job ID: ${tx.jobId || 'N/A'}`);
        }
        console.log('');
      });

      // Check for package purchases specifically
      const packagePurchases = transactionsSnapshot.docs.filter(doc =>
        doc.data().type === 'package_purchase'
      );

      if (packagePurchases.length > 0 && packages.length === 0) {
        console.log('🚨 CRITICAL ISSUE DETECTED:');
        console.log('   - Transaction records show package purchases');
        console.log('   - BUT user.packages array is EMPTY');
        console.log('   - This means the webhook created the transaction but FAILED to add the package');
        console.log('\n   Possible causes:');
        console.log('   1. Firestore transaction partially failed');
        console.log('   2. Code changed after purchase (packages not being added)');
        console.log('   3. User document update failed but transaction insert succeeded');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error checking user packages:', error);
    throw error;
  }
}

// Run the script
const email = process.argv[2] || 'jenn_o@live.ca';
checkUserPackages(email)
  .then(() => {
    console.log('✅ Check complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
