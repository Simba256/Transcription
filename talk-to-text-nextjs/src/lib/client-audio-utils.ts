/**
 * Client-side audio duration detection utilities
 * These functions can be used in React components
 */

/**
 * Get actual audio duration from a File object (client-side)
 * Returns duration in minutes for UI compatibility
 */
export async function getActualAudioDurationClient(file: File): Promise<number> {
  try {
    console.log(`🎵 Getting actual duration for ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/audio/duration', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      const durationMinutes = result.duration.minutes;
      console.log(`✅ Actual duration: ${durationMinutes} minutes (vs ~${estimateAudioDurationFromSize(file.size)} estimated)`);
      return durationMinutes;
    } else {
      console.warn('⚠️ Duration detection failed, falling back to estimation:', result.error);
      return estimateAudioDurationFromSize(file.size);
    }
    
  } catch (error) {
    console.error('❌ Client duration detection error:', error);
    console.warn('⚠️ Falling back to file size estimation');
    return estimateAudioDurationFromSize(file.size);
  }
}

/**
 * Legacy file size estimation (fallback only)
 * Now matches the server-side implementation
 */
function estimateAudioDurationFromSize(fileSize: number, bitrate = 32): number {
  const fileSizeInBits = fileSize * 8;
  const bitrateInBitsPerSecond = bitrate * 1000;
  const durationInSeconds = fileSizeInBits / bitrateInBitsPerSecond;
  const durationInMinutes = durationInSeconds / 60;
  return Math.max(0.1, Math.round(durationInMinutes * 10) / 10);
}

/**
 * Batch duration detection for multiple files
 */
export async function getBatchAudioDurations(files: File[]): Promise<number[]> {
  console.log(`🎵 Getting durations for ${files.length} files...`);
  
  const durations = await Promise.allSettled(
    files.map(file => getActualAudioDurationClient(file))
  );
  
  return durations.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`⚠️ Duration detection failed for ${files[index].name}, using estimation`);
      return estimateAudioDurationFromSize(files[index].size);
    }
  });
}

/**
 * Smart duration detection with caching
 * Caches results to avoid re-processing the same file
 */
const durationCache = new Map<string, number>();

export async function getCachedAudioDuration(file: File): Promise<number> {
  // Create cache key from file properties
  const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
  
  // Check cache first
  if (durationCache.has(cacheKey)) {
    const cachedDuration = durationCache.get(cacheKey)!;
    console.log(`📋 Using cached duration for ${file.name}: ${cachedDuration} minutes`);
    return cachedDuration;
  }
  
  // Get actual duration
  const duration = await getActualAudioDurationClient(file);
  
  // Cache the result
  durationCache.set(cacheKey, duration);
  
  return duration;
}