import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats duration in seconds to HH:MM:SS or MM:SS format
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats duration in seconds to human-readable format (e.g., "3 minutes", "45 seconds", "1 hour 30 minutes")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0 seconds';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  
  if (secs > 0 && hours === 0) { // Only show seconds if no hours
    parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) {
    return '0 seconds';
  }
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  if (parts.length === 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  
  // Should never reach here, but just in case
  return parts.join(' ');
}

/**
 * Converts seconds to rounded-up minutes for billing calculations
 * Handles floating point precision issues (e.g., 600.1 seconds should be 10 minutes, not 11)
 */
export function getBillingMinutes(seconds: number): number {
  if (!seconds || seconds <= 0) return 1; // Minimum 1 minute for billing

  // Round seconds to 2 decimal places to handle floating point precision issues
  const roundedSeconds = Math.round(seconds * 100) / 100;

  // Calculate minutes
  const minutes = roundedSeconds / 60;

  // If we're within 0.01 seconds of a whole minute, treat it as that whole minute
  // This handles cases like 600.001 seconds = 10 minutes exactly
  if (Math.abs(minutes - Math.round(minutes)) < 0.0002) {
    return Math.round(minutes);
  }

  // Otherwise, round up partial minutes
  return Math.ceil(minutes);
}