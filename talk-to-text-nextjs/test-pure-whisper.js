#!/usr/bin/env node

const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing pure Whisper output (no GPT-4 enhancement)...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testPureWhisper() {
  console.log('\n📁 Testing pure Whisper transcription...');
  
  const audioPath = '/media/basim/New Volume/Basim/Saad Bhai/Chamelion Ideas/Transcription/Audio/harvard.wav';
  const audioBuffer = fs.readFileSync(audioPath);
  
  console.log('⏳ Sending to OpenAI Whisper (pure output, no enhancement)...');
  
  const startTime = Date.now();
  
  // Create a file-like object for OpenAI
  const audioFile = new File([audioBuffer], 'harvard.wav', { type: 'audio/wav' });
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'text',
    language: 'en'
  });
  
  const duration = Date.now() - startTime;
  
  console.log('✅ Pure Whisper transcription successful!');
  console.log('⏱️ Processing time:', Math.round(duration / 1000), 'seconds');
  console.log('📝 Pure Whisper Result:');
  console.log('"' + transcription + '"');
  
  const wordCount = transcription.split(' ').length;
  console.log('📊 Word count:', wordCount);
  
  return {
    transcript: transcription,
    wordCount: wordCount,
    processingTime: duration
  };
}

async function main() {
  try {
    const result = await testPureWhisper();
    
    console.log('\n🎉 Pure Whisper test completed successfully!');
    console.log('📋 Summary:');
    console.log(`  • Processing time: ${Math.round(result.processingTime / 1000)}s`);
    console.log(`  • Word count: ${result.wordCount}`);
    console.log(`  • Pure transcription (no modifications): "${result.transcript}"`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();