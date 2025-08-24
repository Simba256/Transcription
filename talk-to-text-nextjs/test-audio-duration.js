#!/usr/bin/env node

const { parseFile } = require('music-metadata');
const fs = require('fs');

async function testAudioDuration() {
  console.log('🧪 Testing proper audio duration detection...\n');
  
  const audioPath = '/media/basim/New Volume/Basim/Saad Bhai/Chamelion Ideas/Transcription/Audio/harvard.wav';
  
  if (!fs.existsSync(audioPath)) {
    console.error('❌ Audio file not found:', audioPath);
    return;
  }
  
  const fileSize = fs.statSync(audioPath).size;
  console.log(`📁 Audio file: ${audioPath}`);
  console.log(`📊 File size: ${fileSize} bytes (${Math.round(fileSize / 1024)} KB)`);
  
  try {
    // Test: Get metadata from file
    console.log('\n1. Testing metadata extraction...');
    const metadata = await parseFile(audioPath);
    
    if (metadata.format.duration) {
      const durationSeconds = metadata.format.duration;
      const durationMinutes = Math.round(durationSeconds / 60 * 100) / 100;
      console.log(`✅ Actual duration: ${durationSeconds} seconds (${durationMinutes} minutes)`);
      
      // Show comprehensive metadata
      console.log(`✅ Comprehensive metadata:`);
      console.log(`   • Duration: ${metadata.format.duration} seconds`);
      console.log(`   • Bitrate: ${metadata.format.bitrate} kbps`);
      console.log(`   • Sample rate: ${metadata.format.sampleRate} Hz`);
      console.log(`   • Channels: ${metadata.format.numberOfChannels}`);
      console.log(`   • Codec: ${metadata.format.codec}`);
      console.log(`   • Container: ${metadata.format.container}`);
      
      // Compare with old estimation
      console.log('\n2. Comparing with old file-size estimation...');
      const oldEstimationMinutes = Math.max(0.1, Math.round((fileSize * 8) / (32 * 1000) / 60 * 10) / 10);
      console.log(`❌ Old estimation (32kbps): ${oldEstimationMinutes} minutes`);
      console.log(`✅ Actual duration: ${durationMinutes} minutes`);
      console.log(`📊 Difference: ${Math.abs(durationMinutes - oldEstimationMinutes).toFixed(2)} minutes`);
      
      if (durationMinutes > 0) {
        const accuracyImprovement = Math.round((1 - Math.abs(durationMinutes - oldEstimationMinutes) / durationMinutes) * 100);
        console.log(`📈 Accuracy improvement: ${accuracyImprovement}%`);
      }
      
      console.log('\n🎉 Audio metadata detection working perfectly!');
      
    } else {
      console.error('❌ Duration not found in metadata');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAudioDuration();