require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addCredits() {
  try {
    // Find user by email
    const userRecord = await admin.auth().getUserByEmail('user@demo.com');
    const userId = userRecord.uid;

    console.log(`Found user: ${userId}`);

    // Get current credits
    const userDoc = await db.collection('users').doc(userId).get();
    const currentCredits = userDoc.data()?.credits || 0;

    console.log(`Current credits: ${currentCredits}`);

    // Add 1,000,000 credits
    const newCredits = currentCredits + 1000000;

    await db.collection('users').doc(userId).update({
      credits: newCredits,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add transaction record
    await db.collection('credits').add({
      userId: userId,
      amount: 1000000,
      type: 'adjustment',
      description: 'Manual credit addition for testing',
      balanceBefore: currentCredits,
      balanceAfter: newCredits,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✓ Successfully added 1,000,000 credits`);
    console.log(`New balance: ${newCredits} credits`);

    process.exit(0);
  } catch (error) {
    console.error('Error adding credits:', error);
    process.exit(1);
  }
}

addCredits();
