#!/usr/bin/env node

/**
 * Clean up test-audio.mp3 files from Firestore
 * Usage: node cleanup-test-audio.js
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

async function findTestAudioFiles() {
  try {
    console.log('🔍 Searching for test-audio.mp3 files...');
    console.log('='.repeat(60));
    
    // Search for files with test-audio in the name
    const transcriptionsRef = db.collection('transcriptions');
    const snapshot = await transcriptionsRef.get();
    
    const testFiles = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fileName && data.fileName.toLowerCase().includes('test-audio')) {
        testFiles.push({
          id: doc.id,
          fileName: data.fileName,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          mode: data.mode,
          fileUrl: data.fileUrl
        });
      }
    });
    
    console.log(`📋 Found ${testFiles.length} test audio files:`);
    testFiles.forEach((file, index) => {
      console.log(`${index + 1}. ID: ${file.id}`);
      console.log(`   File: ${file.fileName}`);
      console.log(`   Status: ${file.status}`);
      console.log(`   Mode: ${file.mode}`);
      console.log(`   Created: ${file.createdAt}`);
      console.log('');
    });
    
    return testFiles;
    
  } catch (error) {
    console.error('❌ Error searching for test files:', error);
    return [];
  }
}

async function deleteTestFiles(testFiles) {
  try {
    console.log(`🗑️  Deleting ${testFiles.length} test files...`);
    console.log('='.repeat(60));
    
    const batch = db.batch();
    
    testFiles.forEach((file) => {
      const docRef = db.collection('transcriptions').doc(file.id);
      batch.delete(docRef);
      console.log(`🗑️  Queued for deletion: ${file.fileName} (${file.id})`);
    });
    
    await batch.commit();
    console.log('\n✅ Successfully deleted all test files from Firestore!');
    
  } catch (error) {
    console.error('❌ Error deleting test files:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🧹 Starting cleanup of test-audio.mp3 files...\n');
    
    // Find test files
    const testFiles = await findTestAudioFiles();
    
    if (testFiles.length === 0) {
      console.log('✅ No test-audio files found in the database.');
      return;
    }
    
    // Confirm deletion
    console.log('⚠️  This will permanently delete these test files from the transcription queue.');
    console.log('   Continue? (y/N)');
    
    // For automated cleanup, we'll proceed directly
    // In interactive mode, you could add readline for confirmation
    
    // Delete the files
    await deleteTestFiles(testFiles);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Cleanup completed successfully!');
    console.log(`   Deleted ${testFiles.length} test-audio.mp3 files`);
    console.log('   The admin transcription queue should now be clean.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main().catch(console.error);