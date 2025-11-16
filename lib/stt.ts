/**
 * Speech-to-Text (STT) Integration
 * Uses OpenAI Whisper API for transcription
 */

import OpenAI from "openai";
import type { Caption, Word } from "@/types";

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
};

/**
 * Generate captions from video file using OpenAI Whisper API
 * @param videoFile - The video file (MP4) to transcribe
 * @param language - Optional language code ('hi', 'en', or 'auto')
 * @returns Array of captions with timestamps
 */
export async function generateCaptions(
  videoFile: File | Buffer,
  language?: "hi" | "en" | "auto"
): Promise<Caption[]> {
  const openai = getOpenAIClient();

  try {
    // Convert File to format OpenAI expects
    const file = videoFile;

    // Call OpenAI Whisper API
    // Note: OpenAI Whisper API accepts video files directly
    const transcription = await openai.audio.transcriptions.create({
      file: file as any, // OpenAI SDK accepts File or Buffer
      model: "whisper-1",
      language: language === "auto" ? undefined : language,
      response_format: "verbose_json", // Get detailed response with timestamps
      timestamp_granularities: ["segment", "word"], // Get both segment and word-level timestamps
    });

    // Process the response into our Caption format
    const captions: Caption[] = [];

    if (transcription.segments && transcription.segments.length > 0) {
      transcription.segments.forEach((segment, index) => {
        // Extract word-level timing if available
        // Note: TypeScript types may not include 'words' property, but API returns it with timestamp_granularities
        const segmentWithWords = segment as any;
        const words: Word[] | undefined = segmentWithWords.words
          ? segmentWithWords.words.map((word: any) => ({
              text: word.word,
              start: word.start,
              end: word.end,
              confidence: word.probability,
            }))
          : undefined;

        captions.push({
          id: index + 1,
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          words,
        });
      });
    } else {
      // Fallback: If no segments, create a single caption
      // This shouldn't happen with verbose_json, but handle it anyway
      if (transcription.text) {
        captions.push({
          id: 1,
          start: 0,
          end: transcription.duration || 0,
          text: transcription.text.trim(),
        });
      }
    }

    return captions;
  } catch (error) {
    console.error("STT Error:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate captions: ${error.message}`);
    }
    throw new Error("Failed to generate captions: Unknown error");
  }
}

/**
 * Retry wrapper for STT API calls
 * Implements exponential backoff for rate limiting
 */
export async function generateCaptionsWithRetry(
  videoFile: File | Buffer,
  language?: "hi" | "en" | "auto",
  maxRetries: number = 3
): Promise<Caption[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateCaptions(videoFile, language);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes("rate limit") ||
          error.message.includes("429"));

      if (isRateLimit && attempt < maxRetries - 1) {
        // Exponential backoff: wait 2^attempt seconds
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited. Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // If not rate limit or last attempt, throw
      throw lastError;
    }
  }

  throw lastError || new Error("Failed to generate captions after retries");
}

