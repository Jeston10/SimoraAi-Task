/**
 * Video-related type definitions
 */

export interface Video {
  id: string;
  originalUrl: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  uploadedAt: Date;
  status: "uploaded" | "processing" | "ready" | "error";
  error?: string;
}

export interface VideoUploadResponse {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  message: string;
  error?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  format: string;
}

