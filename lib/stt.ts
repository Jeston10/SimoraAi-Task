/**
 * Speech-to-Text (STT) Integration
 * Supports multiple providers:
 * - Hugging Face Inference API (FREE, recommended)
 * - OpenAI Whisper API (paid, fallback)
 */

import OpenAI from "openai";
import { logger } from "./logger";
import type { Caption, Word } from "@/types";

// STT Provider type
type STTProvider = "huggingface" | "openai" | "auto";

// Get STT provider preference
// Priority: Hugging Face (FREE) > OpenAI (paid fallback)
const getSTTProvider = (): STTProvider => {
  const provider = process.env.STT_PROVIDER || "auto";
  if (provider === "huggingface" || provider === "openai") {
    return provider;
  }
  // Auto-detect: ALWAYS prefer Hugging Face if available (FREE), fallback to OpenAI (paid)
  if (process.env.HUGGINGFACE_API_KEY) {
    return "huggingface"; // Primary: FREE Hugging Face
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai"; // Fallback: Paid OpenAI
  }
  throw new Error("No STT provider configured. Set HUGGINGFACE_API_KEY (recommended, FREE) or OPENAI_API_KEY");
};

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
};

/**
 * Generate captions using Hugging Face Inference API (FREE)
 * Uses openai/whisper-large-v3 model
 */
async function generateCaptionsHuggingFace(
  videoFile: File | Buffer,
  language?: "hi" | "en" | "auto"
): Promise<Caption[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  const model = "openai/whisper-large-v3";
  const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

  try {
    logger.info("Using Hugging Face Whisper API", {
      model,
      language: language || "auto",
    });

    // Convert file to Blob
    let fileData: Blob;
    if (videoFile instanceof File) {
      fileData = videoFile;
    } else {
      // Convert Buffer to Uint8Array for Blob
      const uint8Array = new Uint8Array(videoFile);
      fileData = new Blob([uint8Array], { type: "video/mp4" });
    }

    // Prepare language parameter
    const languageParam = language === "auto" ? undefined : language;

    // Call Hugging Face API
    const formData = new FormData();
    formData.append("file", fileData, "video.mp4");
    if (languageParam) {
      formData.append("language", languageParam);
    }
    formData.append("return_timestamps", "word");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Handle model loading state (first request can take time)
    if (result.error && result.error.includes("loading")) {
      logger.info("Model is loading, waiting and retrying...", { model });
      // Wait 10 seconds and retry once
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const retryResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
      if (!retryResponse.ok) {
        const retryErrorText = await retryResponse.text();
        throw new Error(`Hugging Face API error after retry: ${retryResponse.status} - ${retryErrorText}`);
      }
      const retryResult = await retryResponse.json();
      // Use retry result
      Object.assign(result, retryResult);
    }

    // Process response into Caption format
    const captions: Caption[] = [];

    if (result.text && result.chunks) {
      // Process chunks with timestamps
      result.chunks.forEach((chunk: any, index: number) => {
        const words: Word[] | undefined = chunk.timestamp
          ? [
              {
                text: chunk.text || "",
                start: chunk.timestamp[0] || 0,
                end: chunk.timestamp[1] || 0,
              },
            ]
          : undefined;

        captions.push({
          id: index + 1,
          start: chunk.timestamp?.[0] || 0,
          end: chunk.timestamp?.[1] || 0,
          text: chunk.text || "",
          words,
        });
      });
    } else if (result.text) {
      // Fallback: single caption if no chunks
      captions.push({
        id: 1,
        start: 0,
        end: result.duration || 0,
        text: result.text,
      });
    }

    logger.info("Hugging Face transcription completed", {
      captionCount: captions.length,
      language: language || "auto",
    });

    return captions;
  } catch (error) {
    logger.error("Hugging Face transcription failed", error as Error, {
      language: language || "auto",
    });
    throw error;
  }
}

/**
 * Generate captions from video file using OpenAI Whisper API
 * @param videoFile - The video file (MP4) to transcribe
 * @param language - Optional language code ('hi', 'en', or 'auto')
 * @returns Array of captions with timestamps
 */
async function generateCaptionsOpenAI(
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

    logger.info("OpenAI transcription completed", {
      captionCount: captions.length,
      language: language || "auto",
    });

    return captions;
  } catch (error) {
    logger.error("OpenAI transcription failed", error as Error, {
      language: language || "auto",
    });

    if (error instanceof Error) {
      throw new Error(`Failed to generate captions: ${error.message}`);
    }
    throw new Error("Failed to generate captions: Unknown error");
  }
}

/**
 * Generate captions from video file
 * Automatically selects provider based on configuration
 * @param videoFile - The video file (MP4) to transcribe
 * @param language - Optional language code ('hi', 'en', or 'auto')
 * @returns Array of captions with timestamps
 */
export async function generateCaptions(
  videoFile: File | Buffer,
  language?: "hi" | "en" | "auto"
): Promise<Caption[]> {
  const provider = getSTTProvider();

  try {
    if (provider === "huggingface") {
      return await generateCaptionsHuggingFace(videoFile, language);
    } else {
      return await generateCaptionsOpenAI(videoFile, language);
    }
  } catch (error) {
    // If primary provider fails, try fallback
    if (provider === "huggingface" && process.env.OPENAI_API_KEY) {
      logger.warn("Hugging Face failed, falling back to OpenAI", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return await generateCaptionsOpenAI(videoFile, language);
    } else if (provider === "openai" && process.env.HUGGINGFACE_API_KEY) {
      logger.warn("OpenAI failed, falling back to Hugging Face", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return await generateCaptionsHuggingFace(videoFile, language);
    }
    throw error;
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
        logger.warn("Rate limited, retrying with exponential backoff", {
          attempt: attempt + 1,
          maxRetries,
          waitTimeMs: waitTime,
        });
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // If not rate limit or last attempt, throw
      throw lastError;
    }
  }

  throw lastError || new Error("Failed to generate captions after retries");
}

