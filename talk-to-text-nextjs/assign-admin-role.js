#!/usr/bin/env node

/**
 * Admin Role Assignment Script
 * Usage: node assign-admin-role.js <email>
 * Example: node assign-admin-role.js abc1111@gmail.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Look for service account key in common locations
  const serviceAccountPaths = [
    './Firebase_creds/serviceAccountKey.json',
    '../Firebase_creds/serviceAccountKey.json',
    '../Firebase_creds/transcription-a1b5a-firebase-adminsdk-fbsvc-82781a96be.json',
    './serviceAccountKey.json'
  ];

  let serviceAccount = null;
  for (const credPath of serviceAccountPaths) {
    try {
      serviceAccount = require(path.resolve(credPath));
      console.log(`✅ Found Firebase credentials at: ${credPath}`);
      break;
    } catch (error) {
      // Continue to next path
    }
  }

  if (!serviceAccount) {
    console.error('❌ Firebase service account key not found. Please ensure serviceAccountKey.json exists in:');
    serviceAccountPaths.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function findUserByEmail(email) {
  try {
    console.log(`🔍 Searching for user with email: ${email}`);
    
    // First try to find by auth record
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ Found auth record for ${email}, UID: ${userRecord.uid}`);
      return userRecord.uid;
    } catch (authError) {
      console.log(`⚠️  No auth record found for ${email}, searching Firestore...`);
    }
    
    // Search in Firestore users collection
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      console.log(`✅ Found Firestore user document: ${userDoc.id}`);
      return userDoc.id;
    }
    
    console.log(`❌ User not found with email: ${email}`);
    return null;
    
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

async function assignAdminRole(userId) {
  try {
    console.log(`🔧 Assigning admin role to user: ${userId}`);
    
    // Update user document in Firestore
    await db.collection('users').doc(userId).update({
      role: 'admin',
      roles: ['user', 'admin'],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminAssignedBy: 'system'
    });
    
    console.log(`✅ Admin role successfully assigned to user: ${userId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error assigning admin role:', error);
    return false;
  }
}

async function checkCurrentRole(userId) {
  try {
    console.log(`📋 Checking current role for user: ${userId}`);
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`⚠️  User document does not exist in Firestore`);
      return null;
    }
    
    const userData = userDoc.data();
    console.log(`📋 Current user data:`, {
      role: userData.role,
      roles: userData.roles,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });
    
    return userData.role;
    
  } catch (error) {
    console.error('Error checking current role:', error);
    return null;
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Usage: node assign-admin-role.js <email>');
    console.error('   Example: node assign-admin-role.js abc1111@gmail.com');
    process.exit(1);
  }
  
  console.log(`🚀 Starting admin role assignment for: ${email}`);
  console.log('='.repeat(60));
  
  try {
    // Find user by email
    const userId = await findUserByEmail(email);
    
    if (!userId) {
      console.error(`❌ Cannot assign admin role: User not found with email ${email}`);
      console.log('\n💡 Make sure the user has:');
      console.log('   1. Created an account on the platform');
      console.log('   2. Logged in at least once');
      process.exit(1);
    }
    
    // Check current role
    const currentRole = await checkCurrentRole(userId);
    
    if (currentRole === 'admin') {
      console.log(`✅ User ${email} already has admin role!`);
      process.exit(0);
    }
    
    // Assign admin role
    const success = await assignAdminRole(userId);
    
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log(`🎉 SUCCESS! Admin role assigned to: ${email}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Access the admin dashboard at: /admin`);
      console.log('='.repeat(60));
    } else {
      console.error(`❌ Failed to assign admin role to ${email}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);