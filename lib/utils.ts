/**
 * General utility functions
 */

/**
 * Generate a unique ID for videos, jobs, etc.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Validate MP4 file
 */
export function isValidMP4File(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.includes("video/mp4") && !file.name.toLowerCase().endsWith(".mp4")) {
    return { valid: false, error: "File must be an MP4 video" };
  }

  // Check file size (100MB limit)
  const maxSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 100MB" };
  }

  return { valid: true };
}

