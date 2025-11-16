/**
 * Caption-related type definitions
 */

export interface Caption {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string; // Can contain Hindi (Devanagari) and English
  words?: Word[]; // For karaoke-style word-by-word highlighting
}

export interface Word {
  text: string;
  start: number; // seconds
  end: number; // seconds
  confidence?: number;
}

export interface CaptionStyle {
  id: "bottom" | "top" | "karaoke";
  name: string;
  description: string;
}

export interface CaptionGenerationRequest {
  videoId: string;
  language?: "hi" | "en" | "auto";
}

export interface CaptionGenerationResponse {
  success: boolean;
  captions?: Caption[];
  language?: string;
  message: string;
  error?: string;
}

