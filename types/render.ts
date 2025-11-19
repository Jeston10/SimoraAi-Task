/**
 * Render job-related type definitions
 */

import type { Caption } from "./caption";

export type RenderQuality = "720p" | "1080p";
export type CaptionStyleId = "bottom" | "top" | "karaoke";
export type RenderJobStatus = "queued" | "processing" | "completed" | "failed";

export interface RenderJob {
  id: string;
  videoId: string;
  captions: Caption[];
  style: CaptionStyleId;
  quality: RenderQuality;
  status: RenderJobStatus;
  progress: number; // 0-100
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface RenderRequest {
  videoId: string;
  videoUrl?: string; // Original video URL for fallback download
  captions: Caption[];
  style: CaptionStyleId;
  quality?: RenderQuality;
}

export interface RenderResponse {
  success: boolean;
  jobId?: string;
  status?: RenderJobStatus;
  progress?: number;
  outputUrl?: string;
  message: string;
  error?: string;
}

