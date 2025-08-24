#!/usr/bin/env node

/**
 * Check User Role Script
 * Usage: node check-user-role.js <email>
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require(path.resolve('../Firebase_creds/transcription-a1b5a-firebase-adminsdk-fbsvc-82781a96be.json'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUserRole(email) {
  try {
    console.log(`🔍 Checking role for user: ${email}`);
    console.log('='.repeat(50));
    
    // Find user by email
    let userId = null;
    
    // Check auth first
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      userId = userRecord.uid;
      console.log(`✅ Firebase Auth UID: ${userId}`);
    } catch (error) {
      console.log(`⚠️  No auth record found for ${email}`);
    }
    
    // Check Firestore document
    if (userId) {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log(`✅ Firestore document found`);
        console.log(`📋 User Profile:`, {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          roles: userData.roles,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
          adminAssignedAt: userData.adminAssignedAt?.toDate?.() || userData.adminAssignedAt
        });
        
        // Check admin status
        const isAdmin = userData.role === 'admin' || (userData.roles && userData.roles.includes('admin'));
        console.log(`${isAdmin ? '✅' : '❌'} Admin Status: ${isAdmin ? 'YES' : 'NO'}`);
        
      } else {
        console.log(`❌ No Firestore document found for UID: ${userId}`);
      }
    } else {
      console.log(`❌ Could not find user with email: ${email}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking user role:', error);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node check-user-role.js <email>');
  process.exit(1);
}

checkUserRole(email).catch(console.error);