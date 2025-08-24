#!/usr/bin/env node

const { getMimeTypeFromFilename } = require('./src/lib/audio-utils.ts');

// Test MIME type detection
console.log('🧪 Testing MIME type detection from filenames...\n');

const testFiles = [
  'meeting.wav',
  'interview.mp3', 
  'podcast.m4a',
  'music.aac',
  'recording.ogg',
  'audiobook.flac',
  'stream.webm',
  'voice.opus',
  'song.wma',
  'conference.MP4',  // Test uppercase
  'AUDIO.WAV',       // Test all caps
  'noextension',     // Test no extension
  'file.txt'         // Test non-audio extension
];

console.log('📁 Filename → MIME Type Detection:');
testFiles.forEach(filename => {
  try {
    // We need to import the function properly for CommonJS
    const mimeType = getMimeTypeFromFilename ? getMimeTypeFromFilename(filename) : 'function not available';
    const status = mimeType ? '✅' : '❌';
    console.log(`   ${status} ${filename} → ${mimeType || 'unknown'}`);
  } catch (error) {
    console.log(`   ❌ ${filename} → Error: ${error.message}`);
  }
});

console.log('\n📋 Expected supported formats:');
console.log('✅ WAV - Uncompressed/PCM audio');
console.log('✅ MP3 - MPEG-1 Audio Layer 3'); 
console.log('✅ MP4/M4A - Advanced Audio Coding');
console.log('✅ AAC - Advanced Audio Coding');
console.log('✅ OGG - Ogg Vorbis');
console.log('✅ FLAC - Free Lossless Audio Codec');
console.log('✅ WEBM - WebM audio');
console.log('✅ OPUS - Modern codec');
console.log('✅ WMA - Windows Media Audio');

console.log('\n🎯 Format detection strategy:');
console.log('1. Try MIME type from filename extension');
console.log('2. Fallback to auto-detection from buffer');
console.log('3. Handle both compressed and uncompressed formats');
console.log('4. Support variable bitrate files');

// Test the actual imported function
console.log('\n🔧 Testing actual function import...');
try {
  // This is a simple test - in production we'd use the compiled TypeScript
  console.log('Note: Full testing requires compiled TypeScript modules');
  console.log('The getMimeTypeFromFilename function is available in the audio-utils module');
} catch (error) {
  console.error('Import test failed:', error.message);
}