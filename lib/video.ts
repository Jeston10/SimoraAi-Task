/**
 * Video processing utility functions
 */

import type { VideoMetadata } from "@/types";

/**
 * Extract video metadata using HTML5 Video element
 * This is a client-side function that extracts basic metadata
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fileSize: file.size,
        format: "mp4",
      });
    });

    video.addEventListener("error", (_e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    });

    video.src = url;
    video.load();
  });
}

/**
 * Create a blob URL from a file
 */
export function createVideoBlobUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeVideoBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

