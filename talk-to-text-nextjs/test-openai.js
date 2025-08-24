#!/usr/bin/env node

const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing OpenAI API directly...');

// Check if API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('✅ API key loaded:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testConnection() {
  console.log('\n1. Testing basic OpenAI connection...');
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, respond with 'OpenAI connection works!'" }],
      max_tokens: 10
    });
    
    console.log('✅ Connection test successful:', response.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function testWhisperWithSample() {
  console.log('\n2. Testing Whisper API with small audio file...');
  
  // Check if the harvard.wav file exists locally
  const audioPath = '/media/basim/New Volume/Basim/Saad Bhai/Chamelion Ideas/Transcription/Audio/harvard.wav';
  
  if (!fs.existsSync(audioPath)) {
    console.error('❌ Audio file not found at:', audioPath);
    return false;
  }
  
  try {
    console.log('📁 Audio file found, size:', fs.statSync(audioPath).size, 'bytes');
    console.log('⏳ Sending to OpenAI Whisper...');
    
    const audioBuffer = fs.readFileSync(audioPath);
    
    // Create a file-like object for OpenAI
    const audioFile = new File([audioBuffer], 'harvard.wav', { type: 'audio/wav' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en'
    });
    
    console.log('✅ Whisper transcription successful!');
    console.log('📝 Result:', transcription);
    return true;
    
  } catch (error) {
    console.error('❌ Whisper test failed:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.status, error.response.data);
    }
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting OpenAI API tests...\n');
  
  // Test 1: Basic connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ Stopping tests - connection failed');
    process.exit(1);
  }
  
  // Test 2: Whisper transcription
  const whisperOk = await testWhisperWithSample();
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log(`\n📊 Tests completed in ${duration} seconds`);
  console.log('✅ Connection:', connectionOk ? 'OK' : 'FAILED');
  console.log('✅ Whisper:', whisperOk ? 'OK' : 'FAILED');
  
  if (connectionOk && whisperOk) {
    console.log('\n🎉 All tests passed! OpenAI integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

main().catch(console.error);