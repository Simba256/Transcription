#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Firebase config from your .env.local
const firebaseConfig = {
  apiKey: "AIzaSyAAFT844-xMh65PebJT8JG1zF7fuz3fpUU",
  authDomain: "transcription-a1b5a.firebaseapp.com",
  projectId: "transcription-a1b5a",
  storageBucket: "transcription-a1b5a.firebasestorage.app",
  messagingSenderId: "404734374856",
  appId: "1:404734374856:web:0a2d61c889d840da5b06fd",
  measurementId: "G-FTDBKKY1W3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTranscriptionJobs() {
  try {
    console.log('🔍 Checking Firestore for transcription jobs...\n');
    
    // Get recent transcription jobs
    const q = query(
      collection(db, 'transcriptions'), 
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ No transcription jobs found in Firestore');
      return;
    }
    
    console.log(`✅ Found ${querySnapshot.size} transcription job(s):\n`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📄 Job ID: ${doc.id}`);
      console.log(`   File: ${data.fileName}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Mode: ${data.mode}`);
      console.log(`   Speechmatics ID: ${data.speechmaticsJobId || 'Not assigned'}`);
      console.log(`   Created: ${data.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}`);
      if (data.error) {
        console.log(`   Error: ${data.error}`);
      }
      console.log('   ' + '-'.repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Error checking Firestore:', error.message);
  }
}

checkTranscriptionJobs().catch(console.error);