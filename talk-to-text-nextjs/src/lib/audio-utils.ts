import { parseBuffer } from 'music-metadata';
import fs from 'fs';

/**
 * Audio format MIME type mappings
 */
const AUDIO_MIME_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus'
};

/**
 * Get MIME type from filename extension
 */
export function getMimeTypeFromFilename(filename: string): string | undefined {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return AUDIO_MIME_TYPES[extension];
}

/**
 * Extract actual duration from audio file metadata
 * Returns duration in seconds (not minutes like the old estimation)
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const buffer = fs.readFileSync(filePath);
    const metadata = await parseBuffer(buffer);
    
    if (metadata.format.duration) {
      console.log(`📊 Audio duration detected: ${metadata.format.duration} seconds (${Math.round(metadata.format.duration / 60 * 10) / 10} minutes)`);
      return metadata.format.duration;
    } else {
      throw new Error('Duration not found in audio metadata');
    }
  } catch (error) {
    console.error('Error reading audio metadata:', error);
    throw new Error(`Failed to read audio duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract duration from audio buffer (for uploaded files)
 * Returns duration in seconds
 * Supports all major audio formats: WAV, MP3, MP4, M4A, AAC, OGG, FLAC, WEBM
 */
export async function getAudioDurationFromBuffer(buffer: Buffer, mimeType?: string): Promise<number> {
  try {
    // First try with provided MIME type
    let metadata;
    
    if (mimeType) {
      try {
        metadata = await parseBuffer(buffer, mimeType);
        console.log(`📊 Audio metadata detected with MIME type '${mimeType}': ${metadata.format.container} (${metadata.format.codec})`);
      } catch (mimeError) {
        console.warn(`⚠️  Failed to parse with MIME type '${mimeType}', trying auto-detection...`);
        metadata = await parseBuffer(buffer); // Auto-detect
      }
    } else {
      // Auto-detect format from buffer
      metadata = await parseBuffer(buffer);
      console.log(`📊 Audio format auto-detected: ${metadata.format.container} (${metadata.format.codec})`);
    }
    
    if (metadata.format.duration) {
      const durationMinutes = Math.round(metadata.format.duration / 60 * 100) / 100;
      console.log(`📊 Audio duration: ${metadata.format.duration} seconds (${durationMinutes} minutes)`);
      console.log(`📊 Audio specs: ${metadata.format.bitrate || 'unknown'} kbps, ${metadata.format.sampleRate || 'unknown'} Hz, ${metadata.format.numberOfChannels || 'unknown'} channels`);
      return metadata.format.duration;
    } else {
      throw new Error('Duration not found in audio metadata');
    }
  } catch (error) {
    console.error('Error reading audio metadata from buffer:', error);
    throw new Error(`Failed to read audio duration from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract duration from remote audio URL
 * Downloads and reads metadata
 */
export async function getAudioDurationFromUrl(audioUrl: string): Promise<number> {
  try {
    console.log(`📥 Downloading audio file to read metadata from: ${audioUrl}`);
    
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Try to determine MIME type from response headers
    const contentType = response.headers.get('content-type');
    
    const metadata = await parseBuffer(buffer, contentType || undefined);
    
    if (metadata.format.duration) {
      console.log(`📊 Audio duration from URL: ${metadata.format.duration} seconds (${Math.round(metadata.format.duration / 60 * 10) / 10} minutes)`);
      return metadata.format.duration;
    } else {
      throw new Error('Duration not found in audio metadata');
    }
  } catch (error) {
    console.error('Error reading audio metadata from URL:', error);
    throw new Error(`Failed to read audio duration from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get comprehensive audio metadata
 */
export async function getAudioMetadata(buffer: Buffer, mimeType?: string) {
  try {
    const metadata = await parseBuffer(buffer, mimeType);
    
    return {
      duration: metadata.format.duration, // in seconds
      bitrate: metadata.format.bitrate,
      sampleRate: metadata.format.sampleRate,
      channels: metadata.format.numberOfChannels,
      codec: metadata.format.codec,
      container: metadata.format.container,
      title: metadata.common.title,
      artist: metadata.common.artist,
      fileSize: buffer.length
    };
  } catch (error) {
    console.error('Error reading comprehensive audio metadata:', error);
    throw error;
  }
}

/**
 * Smart audio duration detection with multiple fallback strategies
 * This function tries multiple methods to ensure we always get a duration
 */
export const getActualAudioDuration = async (
  fileSource: string | Buffer, 
  mimeType?: string,
  filename?: string
): Promise<number> => {
  try {
    // Try to enhance MIME type detection using filename if available
    let detectedMimeType = mimeType;
    if (!detectedMimeType && filename) {
      detectedMimeType = getMimeTypeFromFilename(filename);
      console.log(`🎵 Enhanced MIME detection from filename '${filename}': ${detectedMimeType || 'none'}`);
    }
    
    if (typeof fileSource === 'string') {
      // It's a file path or URL
      if (fileSource.startsWith('http://') || fileSource.startsWith('https://')) {
        return await getAudioDurationFromUrl(fileSource);
      } else {
        return await getAudioDuration(fileSource);
      }
    } else {
      // It's a buffer - try with enhanced MIME type detection
      return await getAudioDurationFromBuffer(fileSource, detectedMimeType);
    }
  } catch (error) {
    console.error('❌ Failed to get actual audio duration, trying fallback strategies:', error);
    
    // Fallback 1: Try without MIME type (auto-detection)
    if (mimeType && typeof fileSource !== 'string') {
      try {
        console.log('🔄 Trying auto-detection without MIME type...');
        return await getAudioDurationFromBuffer(fileSource as Buffer);
      } catch (autoDetectError) {
        console.error('❌ Auto-detection also failed:', autoDetectError);
      }
    }
    
    // Fallback 2: Use old estimation method as last resort
    console.warn('⚠️  Using file size estimation as last resort...');
    const fileSize = typeof fileSource === 'string' ? 
      fs.statSync(fileSource).size : 
      fileSource.length;
    
    const estimatedDuration = estimateAudioDurationFromSize(fileSize);
    console.warn(`⚠️  Estimated duration: ${estimatedDuration} minutes (may be inaccurate)`);
    return estimatedDuration * 60; // Convert minutes to seconds for consistency
  }
};

/**
 * Legacy estimation function (fallback only)
 * Now returns seconds for consistency
 */
const estimateAudioDurationFromSize = (fileSize: number, bitrate = 32): number => {
  const fileSizeInBits = fileSize * 8;
  const bitrateInBitsPerSecond = bitrate * 1000;
  const durationInSeconds = fileSizeInBits / bitrateInBitsPerSecond;
  const durationInMinutes = durationInSeconds / 60;
  return Math.max(0.1, Math.round(durationInMinutes * 10) / 10);
};