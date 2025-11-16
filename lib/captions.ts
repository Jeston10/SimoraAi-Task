/**
 * Caption utility functions
 * For formatting, parsing, and manipulating captions
 */

import type { Caption } from "@/types";

/**
 * Format captions to SRT format
 */
export function formatCaptionsToSRT(captions: Caption[]): string {
  return captions
    .map((caption) => {
      const startTime = formatSRTTime(caption.start);
      const endTime = formatSRTTime(caption.end);
      return `${caption.id}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    })
    .join("\n");
}

/**
 * Format time in seconds to SRT time format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Format captions to VTT format
 */
export function formatCaptionsToVTT(captions: Caption[]): string {
  let vtt = "WEBVTT\n\n";
  vtt += captions
    .map((caption) => {
      const startTime = formatVTTTime(caption.start);
      const endTime = formatVTTTime(caption.end);
      return `${startTime} --> ${endTime}\n${caption.text}\n`;
    })
    .join("\n");
  return vtt;
}

/**
 * Format time in seconds to VTT time format (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Validate caption data
 */
export function validateCaptions(captions: Caption[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(captions) || captions.length === 0) {
    errors.push("Captions array is empty");
    return { valid: false, errors };
  }

  captions.forEach((caption, index) => {
    if (!caption.text || caption.text.trim().length === 0) {
      errors.push(`Caption ${index + 1} has no text`);
    }
    if (caption.start < 0) {
      errors.push(`Caption ${index + 1} has negative start time`);
    }
    if (caption.end <= caption.start) {
      errors.push(
        `Caption ${index + 1} has end time before or equal to start time`
      );
    }
    if (caption.id <= 0) {
      errors.push(`Caption ${index + 1} has invalid ID`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge overlapping captions
 */
export function mergeOverlappingCaptions(captions: Caption[]): Caption[] {
  if (captions.length === 0) return [];

  // Sort by start time
  const sorted = [...captions].sort((a, b) => a.start - b.start);
  const merged: Caption[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If captions overlap or are adjacent, merge them
    if (next.start <= current.end + 0.5) {
      // Merge: extend end time and combine text
      current.end = Math.max(current.end, next.end);
      current.text = `${current.text} ${next.text}`;
      // Merge words if available
      if (current.words && next.words) {
        current.words = [...current.words, ...next.words].sort(
          (a, b) => a.start - b.start
        );
      }
    } else {
      // No overlap, save current and start new
      merged.push(current);
      current = { ...next };
    }
  }

  // Add the last caption
  merged.push(current);

  // Re-number captions
  return merged.map((caption, index) => ({
    ...caption,
    id: index + 1,
  }));
}

