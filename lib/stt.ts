/**
 * Speech-to-Text (STT) Integration
 * Supports multiple providers:
 * - Hugging Face Inference API (FREE, recommended)
 * - OpenAI Whisper API (paid, fallback)
 */

import OpenAI from "openai";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "./logger";
import type { Caption, Word } from "@/types";
import type fluentFfmpeg from "fluent-ffmpeg";

const isServerEnvironment = typeof window === "undefined";

let ffmpegInstance: typeof fluentFfmpeg | null = null;

const getFfmpegInstance = (): typeof fluentFfmpeg => {
  ensureServerRuntime();
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const requiredFfmpeg = eval("require")("fluent-ffmpeg") as typeof fluentFfmpeg & {
    default?: typeof fluentFfmpeg;
  };
  const ffmpegModule = requiredFfmpeg?.default ?? requiredFfmpeg;
  const installer = eval("require")("@ffmpeg-installer/ffmpeg") as { path: string };

  ffmpegModule.setFfmpegPath(installer.path);
  ffmpegInstance = ffmpegModule;
  return ffmpegInstance;
};

const HF_SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/x-flac",
  "audio/flac",
  "audio/mpeg",
  "audio/x-mpeg-3",
  "audio/mpeg3",
  "audio/wave",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/AMR",
  "audio/amr",
  "audio/AMR-WB",
  "audio/AMR-WB+",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/x-mpeg-3": "mp3",
  "audio/mpeg3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "audio/AMR": "amr",
};

interface HuggingFaceAudioPayload {
  buffer: Buffer;
  mime: string;
  fileName: string;
  converted: boolean;
  originalMime?: string;
  originalSize: number;
}

const ensureServerRuntime = () => {
  if (!isServerEnvironment) {
    throw new Error("Hugging Face transcription can only run on the server runtime.");
  }
};

const getExtensionForMime = (mime?: string): string | undefined => {
  if (!mime) return undefined;
  return MIME_EXTENSION_MAP[mime] || mime.split("/").pop();
};

const bufferFromFile = async (file: File): Promise<Buffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const getAudioDuration = async (audioPath: string): Promise<number> => {
  ensureServerRuntime();
  const { spawn } = await import("child_process");
  const ffmpegInstaller = eval("require")("@ffmpeg-installer/ffmpeg") as { path: string };
  const ffmpegPath = ffmpegInstaller.path;

  return new Promise<number>((resolve, reject) => {
    // Use ffmpeg to get duration by parsing output
    const ffmpeg = spawn(ffmpegPath, [
      "-i", audioPath,
      "-f", "null",
      "-"
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", () => {
      // Parse duration from ffmpeg stderr output
      // Format: Duration: HH:MM:SS.mmm
      const durationMatch = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseInt(durationMatch[3], 10);
        const centiseconds = parseInt(durationMatch[4], 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        if (totalSeconds > 0) {
          resolve(totalSeconds);
          return;
        }
      }
      reject(new Error("Could not determine audio duration from ffmpeg output"));
    });

    ffmpeg.on("error", (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
};

const splitAudioIntoSegments = async (
  inputPath: string,
  segmentDuration: number = 30,
  outputDir: string
): Promise<Array<{ path: string; startTime: number; endTime: number }>> => {
  ensureServerRuntime();
  const ffmpeg = getFfmpegInstance();

  const duration = await getAudioDuration(inputPath);
  const segments: Array<{ path: string; startTime: number; endTime: number }> = [];
  const totalSegments = Math.ceil(duration / segmentDuration);

  logger.info("Splitting audio into segments", {
    totalDuration: duration,
    segmentDuration,
    totalSegments,
  });

  for (let i = 0; i < totalSegments; i++) {
    const startTime = i * segmentDuration;
    const endTime = Math.min(startTime + segmentDuration, duration);
    const segmentPath = path.join(outputDir, `segment-${i}-${randomUUID()}.wav`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .noVideo()
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .format("wav")
        .on("end", () => resolve())
        .on("error", (ffmpegError) => reject(ffmpegError))
        .save(segmentPath);
    });

    segments.push({ path: segmentPath, startTime, endTime });
  }

  return segments;
};

const convertBufferToWav = async (buffer: Buffer, originalMime?: string): Promise<Buffer> => {
  ensureServerRuntime();
  const ffmpeg = getFfmpegInstance();

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "hf-audio-"));
  const inputExt = getExtensionForMime(originalMime) || "bin";
  const inputPath = path.join(tempDir, `input-${randomUUID()}.${inputExt}`);
  const outputPath = path.join(tempDir, `output-${randomUUID()}.wav`);

  await fs.writeFile(inputPath, buffer);

  logger.info("Converting media to audio/wav for Hugging Face", {
    tempDir,
    originalMime: originalMime || "unknown",
  });

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .format("wav")
        .on("end", () => resolve())
        .on("error", (ffmpegError) => reject(ffmpegError))
        .save(outputPath);
    });

    const audioBuffer = await fs.readFile(outputPath);
    return audioBuffer;
  } catch (error) {
    logger.error("Failed to convert media to wav for Hugging Face", error as Error, {
      originalMime,
    });
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const prepareAudioPayloadForHuggingFace = async (
  sourceFile: File | Buffer
): Promise<HuggingFaceAudioPayload> => {
  ensureServerRuntime();

  const isFileInput = typeof File !== "undefined" && sourceFile instanceof File;
  let originalMime: string | undefined;
  let originalSize = 0;
  let fileName = "upload";
  let buffer: Buffer;

  if (isFileInput) {
    const file = sourceFile as File;
    buffer = await bufferFromFile(file);
    originalMime = file.type;
    fileName = file.name || fileName;
  } else {
    buffer = sourceFile as Buffer;
    originalMime = undefined;
  }

  originalSize = buffer.length;

  const isAlreadySupportedAudio =
    !!originalMime && HF_SUPPORTED_AUDIO_MIME_TYPES.has(originalMime);

  if (isAlreadySupportedAudio) {
    return {
      buffer,
      mime: originalMime || "audio/wav",
      fileName,
      converted: false,
      originalMime,
      originalSize,
    };
  }

  const convertedBuffer = await convertBufferToWav(buffer, originalMime);
  return {
    buffer: convertedBuffer,
    mime: "audio/wav",
    fileName: `${path.parse(fileName).name || "audio"}.wav`,
    converted: true,
    originalMime,
    originalSize,
  };
};

// STT Provider type
type STTProvider = "huggingface" | "openai" | "auto";

// Helper to check if a key is valid (not placeholder/example)
const isValidApiKey = (key: string | undefined, prefix: string): boolean => {
  if (!key || !key.trim()) return false;
  const trimmed = key.trim();
  // Check if it's a placeholder/example value
  if (
    trimmed.includes("your-") ||
    trimmed.includes("placeholder") ||
    trimmed.includes("example") ||
    trimmed.includes("xxxxx") ||
    trimmed.length < 10 || // Too short to be real
    !trimmed.startsWith(prefix) // Doesn't start with expected prefix
  ) {
    return false;
  }
  return true;
};

// Get STT provider preference
// Priority: Hugging Face (FREE) > OpenAI (paid fallback)
const getSTTProvider = (): STTProvider => {
  const provider = process.env.STT_PROVIDER || "auto";
  if (provider === "huggingface" || provider === "openai") {
    return provider;
  }
  // Auto-detect: ALWAYS prefer Hugging Face if available (FREE), fallback to OpenAI (paid)
  // But only if keys are actually valid (not placeholders)
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  
  const hasValidHF = isValidApiKey(hfKey, "hf_");
  const hasValidOpenAI = isValidApiKey(openAIKey, "sk-");
  
  logger.info("STT provider selection", {
    configuredProvider: provider,
    hasHuggingFaceKey: !!hfKey,
    hasValidHuggingFace: hasValidHF,
    hasOpenAIKey: !!openAIKey,
    hasValidOpenAI: hasValidOpenAI,
  });
  
  if (hasValidHF) {
    return "huggingface"; // Primary: FREE Hugging Face
  }
  if (hasValidOpenAI) {
    return "openai"; // Fallback: Paid OpenAI
  }
  
  // If both are placeholders or empty, prefer Hugging Face if it exists (even if placeholder)
  // But warn if keys are invalid
  if (hfKey && !hasValidHF) {
    logger.warn("HUGGINGFACE_API_KEY appears to be a placeholder. Please set a valid key.");
  }
  if (openAIKey && !hasValidOpenAI) {
    logger.warn("OPENAI_API_KEY appears to be a placeholder. Please set a valid key or remove it.");
  }
  
  // If Hugging Face key exists (even if placeholder), prefer it over placeholder OpenAI
  if (hfKey) {
    return "huggingface";
  }
  // Only use OpenAI if it's valid
  if (hasValidOpenAI) {
    return "openai";
  }
  
  throw new Error(
    "No valid STT provider configured. " +
    "Set HUGGINGFACE_API_KEY (recommended, FREE) starting with 'hf_' or " +
    "set OPENAI_API_KEY starting with 'sk-'. " +
    "Remove any placeholder/example values from .env.local"
  );
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
 * Process a single audio segment through Hugging Face API with retry logic
 */
async function processAudioSegment(
  segmentBuffer: Buffer,
  segmentStartTime: number,
  apiKey: string,
  languageParam: string | undefined,
  model: string,
  apiUrl: string,
  maxRetries: number = 3,
  segmentDuration?: number // Actual duration of the segment in seconds
): Promise<Caption[]> {
  const audioBodyView = new Uint8Array(segmentBuffer);
  const sourceBuffer = audioBodyView.buffer as ArrayBuffer;
  const audioArrayBuffer =
    audioBodyView.byteOffset === 0 && audioBodyView.byteLength === sourceBuffer.byteLength
      ? sourceBuffer
      : sourceBuffer.slice(
          audioBodyView.byteOffset,
          audioBodyView.byteOffset + audioBodyView.byteLength
        );
  const payloadSizeBytes = audioArrayBuffer.byteLength;
  const createAudioBlob = () => new Blob([audioArrayBuffer], { type: "audio/wav" });

  const queryParams = new URLSearchParams();
  queryParams.set("return_timestamps", "word");
  if (languageParam) {
    queryParams.set("language", languageParam);
  }
  const requestUrl = `${apiUrl}?${queryParams.toString()}`;

  let lastError: Error | null = null;
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        logger.info(`Retrying segment (attempt ${attempt + 1}/${maxRetries})`, {
          segmentStartTime,
          backoffDelay,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "audio/wav",
          Accept: "application/json",
          ...(payloadSizeBytes ? { "Content-Length": payloadSizeBytes.toString() } : {}),
        },
        body: createAudioBlob(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Hugging Face API error: ${response.status}`;
        try {
          if (errorText) {
            const errorDetails = JSON.parse(errorText);
            if (errorDetails.error) {
              errorMessage += ` - ${errorDetails.error}`;
            } else {
              errorMessage += ` - ${errorText}`;
            }
          }
        } catch {
          errorMessage += ` - ${errorText || "No error details"}`;
        }
        
        // If it's a rate limit or model loading error, retry
        if (response.status === 429 || response.status === 503 || 
            (errorText && (errorText.includes("loading") || errorText.includes("rate limit")))) {
          lastError = new Error(errorMessage);
          continue; // Retry
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === "") {
        throw new Error("Empty response from Hugging Face API");
      }

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        logger.error("Failed to parse Hugging Face response", parseError as Error, {
          responseText: responseText.substring(0, 200),
        });
        throw new Error(`Invalid JSON response from Hugging Face API: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
      }

      // Handle model loading state
      if (result.error && (result.error.includes("loading") || result.error.includes("model is currently loading"))) {
        logger.info("Model is loading, waiting and retrying segment...", { 
          model, 
          segmentStartTime,
          attempt: attempt + 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15s for model to load
        continue; // Retry
      }

      // Log the raw response for debugging
      logger.info("Hugging Face API response received", {
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        hasChunks: !!result.chunks,
        chunkCount: Array.isArray(result.chunks) ? result.chunks.length : 0,
        hasWords: !!result.words,
        wordCount: Array.isArray(result.words) ? result.words.length : 0,
        resultKeys: Object.keys(result || {}),
        segmentStartTime,
      });

      // If we got here, we have a valid response
      // Process it below
      return processHuggingFaceResponse(result, segmentStartTime, segmentDuration);
      
    } catch (error) {
      lastError = error as Error;
      logger.error(`Segment processing attempt ${attempt + 1} failed`, error as Error, {
        segmentStartTime,
        willRetry: attempt < maxRetries - 1,
      });
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Failed to process audio segment after all retries");
}

/**
 * Process Hugging Face API response into Caption format
 * Creates captions for ALL words/speech in the response
 */
function processHuggingFaceResponse(result: any, segmentStartTime: number, segmentDuration?: number): Caption[] {
  const captions: Caption[] = [];

  const ensurePositiveDuration = (
    start: number,
    end: number,
    fallbackDuration = 0.25
  ): { start: number; end: number } => {
    if (!Number.isFinite(start) || start < 0) {
      start = captions.length > 0 ? captions[captions.length - 1].end : 0;
    }
    if (!Number.isFinite(end)) {
      end = start + fallbackDuration;
    }
    if (end <= start) {
      end = start + Math.max(fallbackDuration, 0.01);
    }
    return { start, end };
  };

  // Check if we have word-level data directly (some API responses have this)
  if (result.words && Array.isArray(result.words) && result.words.length > 0) {
    logger.info("Processing Hugging Face word-level data", {
      wordCount: result.words.length,
      segmentStartTime,
    });

    // Group words into captions (e.g., 5-7 words per caption for readability)
    const WORDS_PER_CAPTION = 5;
    for (let i = 0; i < result.words.length; i += WORDS_PER_CAPTION) {
      const wordGroup = result.words.slice(i, i + WORDS_PER_CAPTION);
      const firstWord = wordGroup[0];
      const lastWord = wordGroup[wordGroup.length - 1];

      const start = segmentStartTime + (typeof firstWord.start === "number" ? firstWord.start : 
        (Array.isArray(firstWord.timestamp) ? firstWord.timestamp[0] : i * 0.3));
      const end = segmentStartTime + (typeof lastWord.end === "number" ? lastWord.end :
        (Array.isArray(lastWord.timestamp) ? lastWord.timestamp[1] : start + wordGroup.length * 0.3));

      const words: Word[] = wordGroup.map((word: any) => {
        const text = word.word || word.text || "";
        const wordStart = segmentStartTime + (typeof word.start === "number" ? word.start :
          (Array.isArray(word.timestamp) ? word.timestamp[0] : 0));
        const wordEnd = segmentStartTime + (typeof word.end === "number" ? word.end :
          (Array.isArray(word.timestamp) ? word.timestamp[1] : wordStart + 0.3));
        return {
          text,
          start: wordStart,
          end: wordEnd,
          confidence: word.score || word.confidence,
        };
      }).filter((w: Word) => w.text.trim() !== "");

      if (words.length > 0) {
        captions.push({
          id: captions.length + 1,
          start,
          end,
          text: words.map(w => w.text).join(" "),
          words,
        });
      }
    }
  } else if (result.text && result.chunks && Array.isArray(result.chunks) && result.chunks.length > 0) {
    logger.info("Processing Hugging Face chunks", {
      chunkCount: result.chunks.length,
      totalTextLength: result.text.length,
      segmentStartTime,
    });
    
    // Calculate effective segment duration ONCE before processing chunks
    // CRITICAL: Use the actual segment duration passed in, not estimate from text
    let effectiveSegmentDuration: number;
    if (segmentDuration && segmentDuration > 0) {
      effectiveSegmentDuration = segmentDuration;
    } else if (typeof result.duration === "number" && result.duration > 0) {
      effectiveSegmentDuration = result.duration;
    } else {
      // Fallback: estimate based on typical speech rate (150 words per minute = 2.5 words per second)
      const estimatedWords = result.text?.split(" ").length || 10;
      effectiveSegmentDuration = Math.max(estimatedWords * 0.4, 5); // At least 5 seconds
    }
    
    result.chunks.forEach((chunk: any, chunkIndex: number) => {
      if (!chunk || !chunk.text || chunk.text.trim() === "") {
        logger.warn(`Skipping empty chunk ${chunkIndex}`, { chunkIndex, segmentStartTime });
        return; // Skip empty chunks
      }

      const rawStart = Array.isArray(chunk.timestamp)
        ? chunk.timestamp[0]
        : chunk.timestamp?.start;
      const rawEnd = Array.isArray(chunk.timestamp)
        ? chunk.timestamp[1]
        : chunk.timestamp?.end;
      
      // Check if we have valid timestamps
      const hasValidStart = typeof rawStart === "number" && Number.isFinite(rawStart) && rawStart >= 0;
      const hasValidEnd = typeof rawEnd === "number" && Number.isFinite(rawEnd) && rawEnd > 0;
      const hasValidTimestamps = hasValidStart && hasValidEnd && rawEnd > rawStart;

      // Log chunk details for debugging
      logger.info(`Processing chunk ${chunkIndex + 1}/${result.chunks.length}`, {
        chunkIndex,
        text: chunk.text.substring(0, 50) + (chunk.text.length > 50 ? "..." : ""),
        textLength: chunk.text.length,
        rawStart,
        rawEnd,
        hasValidTimestamps,
        hasTimestamp: !!chunk.timestamp,
        hasWords: !!chunk.words && Array.isArray(chunk.words),
        wordCount: Array.isArray(chunk.words) ? chunk.words.length : 0,
        segmentStartTime,
        effectiveSegmentDuration,
        providedSegmentDuration: segmentDuration,
      });

      let relativeStart: number;
      let relativeEnd: number;

      if (hasValidTimestamps) {
        // Use provided timestamps
        relativeStart = rawStart as number;
        relativeEnd = rawEnd as number;
      } else {
        // No valid timestamps - distribute chunks evenly across segment duration
        const chunkCount = result.chunks.length;
        const timePerChunk = effectiveSegmentDuration / chunkCount;
        relativeStart = chunkIndex * timePerChunk;
        relativeEnd = (chunkIndex + 1) * timePerChunk;
        
        // Ensure last chunk goes to the end
        if (chunkIndex === chunkCount - 1) {
          relativeEnd = effectiveSegmentDuration;
        }

        logger.info(`Chunk ${chunkIndex + 1} has no valid timestamps, distributing evenly`, {
          chunkIndex,
          relativeStart,
          relativeEnd,
          timePerChunk,
          effectiveSegmentDuration,
        });
      }

      // Ensure positive duration
      const { start: safeStart, end: safeEnd } = ensurePositiveDuration(
        relativeStart,
        relativeEnd,
        (chunk?.text?.split(" ").length || 1) * 0.25
      );

      // Add segment start time offset
      const start = segmentStartTime + safeStart;
      const end = segmentStartTime + safeEnd;

      // Log the final timestamps
      logger.info(`Chunk ${chunkIndex + 1} final timestamps`, {
        chunkIndex,
        relativeStart: safeStart,
        relativeEnd: safeEnd,
        absoluteStart: start,
        absoluteEnd: end,
        segmentStartTime,
      });

      const chunkWords = Array.isArray(chunk?.words) ? chunk.words : undefined;
      let words: Word[] | undefined;

      if (chunkWords && chunkWords.length > 0) {
        const safeChunkDuration = Math.max(end - start, chunkWords.length * 0.05);
        const fallbackStep = safeChunkDuration / chunkWords.length;

        words = chunkWords
          .map((word: any, wordIndex: number) => {
            const token = word?.word || word?.text || "";
            if (!token || token.trim() === "") return null;

            const providedStart =
              typeof word?.start === "number"
                ? word.start
                : Array.isArray(word?.timestamp)
                ? word.timestamp[0]
                : undefined;
            const providedEnd =
              typeof word?.end === "number"
                ? word.end
                : Array.isArray(word?.timestamp)
                ? word.timestamp[1]
                : undefined;

            const fallbackStart = relativeStart + wordIndex * fallbackStep;
            const fallbackEnd =
              wordIndex === chunkWords.length - 1
                ? relativeEnd
                : relativeStart + (wordIndex + 1) * fallbackStep;

            const wordStart =
              typeof providedStart === "number" ? segmentStartTime + providedStart : segmentStartTime + fallbackStart;
            let wordEnd =
              typeof providedEnd === "number" ? segmentStartTime + providedEnd : segmentStartTime + fallbackEnd;
            if (wordEnd <= wordStart) {
              wordEnd = wordStart + Math.max(fallbackStep, 0.01);
            }

            return {
              text: token,
              start: Math.max(start, wordStart),
              end: Math.min(end, wordEnd),
              confidence:
                typeof word?.score === "number"
                  ? word.score
                  : typeof word?.confidence === "number"
                  ? word.confidence
                  : undefined,
            } as Word;
          })
          .filter((word: Word | null): word is Word => !!word);

        if (!words || !words.length) {
          words = undefined;
        }
      } else if (chunk.text) {
        const tokens = chunk.text
          .split(/\s+/)
          .map((token: string) => token.trim())
          .filter(Boolean);

        if (tokens.length > 0) {
          const totalDuration = Math.max(end - start, tokens.length * 0.08);
          const step = totalDuration / tokens.length;
          words = tokens.map((token: string, wordIndex: number) => {
            const wordStart = start + wordIndex * step;
            const wordEnd =
              wordIndex === tokens.length - 1
                ? Math.max(end, wordStart + 0.01)
                : start + (wordIndex + 1) * step;
            return {
              text: token,
              start: wordStart,
              end: wordEnd,
            };
          });
        }
      }

      // CRITICAL FIX: When API returns minimal text, create word-level captions
      // distributed across the FULL segment duration, not just the chunk duration
      const totalWordsInAllChunks = result.chunks.reduce((sum: number, c: any) => {
        return sum + (c.text?.split(/\s+/).filter((w: string) => w.trim() !== "").length || 0);
      }, 0);
      
      // If we have very few words for a long segment, distribute ALL words across the full duration
      const isMinimalTranscription = !hasValidTimestamps && 
                                     effectiveSegmentDuration > 10 && 
                                     totalWordsInAllChunks < effectiveSegmentDuration / 2; // Less than 1 word per 2 seconds
      
      if (isMinimalTranscription) {
        logger.warn("Minimal transcription detected - creating word-level captions across full duration", {
          totalWords: totalWordsInAllChunks,
          segmentDuration: effectiveSegmentDuration,
          chunkIndex,
        });
        
        // Create individual captions for each word, distributed across the FULL segment duration
        const chunkWords = chunk.text.split(/\s+/).filter((w: string) => w.trim() !== "");
        if (chunkWords.length > 0) {
          // Calculate position of this chunk's words within the full segment
          const chunkStartInSegment = (chunkIndex / result.chunks.length) * effectiveSegmentDuration;
          const chunkEndInSegment = ((chunkIndex + 1) / result.chunks.length) * effectiveSegmentDuration;
          const chunkDuration = chunkEndInSegment - chunkStartInSegment;
          const timePerWord = chunkDuration / chunkWords.length;
          
          chunkWords.forEach((word: string, wordIdx: number) => {
            const wordStart = segmentStartTime + chunkStartInSegment + wordIdx * timePerWord;
            const wordEnd = wordIdx === chunkWords.length - 1 
              ? segmentStartTime + chunkEndInSegment
              : segmentStartTime + chunkStartInSegment + (wordIdx + 1) * timePerWord;
            
            captions.push({
              id: captions.length + 1,
              start: wordStart,
              end: wordEnd,
              text: word.trim(),
              words: [{
                text: word.trim(),
                start: wordStart,
                end: wordEnd,
              }],
            });
          });
        } else {
          // Fallback: create caption for the chunk
          captions.push({
            id: captions.length + 1,
            start,
            end,
            text: chunk.text || "",
            words,
          });
        }
      } else {
        // Normal case: create caption for the chunk
        captions.push({
          id: captions.length + 1,
          start,
          end,
          text: chunk.text || "",
          words,
        });
      }
    });

    // Validate transcription coverage
    const totalWords = result.chunks.reduce((sum: number, c: any) => {
      return sum + (c.text?.split(/\s+/).filter((w: string) => w.trim() !== "").length || 0);
    }, 0);
    const coverageRatio = effectiveSegmentDuration > 0 
      ? (captions.length > 0 ? (captions[captions.length - 1].end - captions[0].start) / effectiveSegmentDuration : 0)
      : 0;
    
    if (coverageRatio < 0.3 && effectiveSegmentDuration > 5) {
      logger.warn("Low transcription coverage detected - API may have returned incomplete transcription", {
        coverageRatio: `${(coverageRatio * 100).toFixed(1)}%`,
        segmentDuration: effectiveSegmentDuration,
        totalWords,
        captionCount: captions.length,
        expectedWords: Math.ceil(effectiveSegmentDuration / 2), // Expect ~1 word per 2 seconds
      });
    }

    // Log summary after processing all chunks
    logger.info("Finished processing all chunks", {
      totalChunks: result.chunks.length,
      totalCaptions: captions.length,
      totalWords,
      firstCaptionTime: captions.length > 0 ? captions[0].start : null,
      lastCaptionTime: captions.length > 0 ? captions[captions.length - 1].end : null,
      segmentStartTime,
      effectiveSegmentDuration,
      coverageRatio: `${(coverageRatio * 100).toFixed(1)}%`,
      captionTimeRange: captions.length > 0 
        ? `${captions[0].start.toFixed(2)}s - ${captions[captions.length - 1].end.toFixed(2)}s`
        : "none",
    });
  } else if (result.text && typeof result.text === "string" && result.text.trim() !== "") {
    // Fallback: Create multiple captions from text (split by sentences or words)
    logger.info("Processing Hugging Face text (no chunks/words)", {
      textLength: result.text.length,
      segmentStartTime,
      providedSegmentDuration: segmentDuration,
    });
    
    // Use actual segment duration if provided, otherwise estimate
    const duration = segmentDuration && segmentDuration > 0
      ? segmentDuration
      : (typeof result.duration === "number" && result.duration > 0
          ? result.duration
          : Math.max(result.text.split(" ").length * 0.3, 1));
    
    // Split text into sentences first, then words
    const sentences = result.text.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean);
    
    if (sentences.length > 1) {
      // Create one caption per sentence
      let currentTime = segmentStartTime;
      const timePerSentence = duration / sentences.length;
      
      sentences.forEach((sentence: string) => {
        const tokens = sentence.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return;
        
        const sentenceDuration = Math.max(timePerSentence, tokens.length * 0.3);
        const step = sentenceDuration / tokens.length;
        
        const words: Word[] = tokens.map((token: string, wordIdx: number) => {
          const wordStart = currentTime + wordIdx * step;
          const wordEnd = wordIdx === tokens.length - 1 
            ? currentTime + sentenceDuration
            : currentTime + (wordIdx + 1) * step;
          return {
            text: token,
            start: wordStart,
            end: wordEnd,
          };
        });
        
        captions.push({
          id: captions.length + 1,
          start: currentTime,
          end: currentTime + sentenceDuration,
          text: sentence,
          words: words.length > 0 ? words : undefined,
        });
        
        currentTime += sentenceDuration;
      });
    } else {
      // No sentences, split into word groups (5-7 words per caption)
      const tokens = result.text.split(/\s+/).filter(Boolean);
      const WORDS_PER_CAPTION = 5;
      const timePerWord = duration / tokens.length;
      
      for (let i = 0; i < tokens.length; i += WORDS_PER_CAPTION) {
        const wordGroup = tokens.slice(i, i + WORDS_PER_CAPTION);
        const groupStart = segmentStartTime + i * timePerWord;
        const groupEnd = segmentStartTime + Math.min((i + wordGroup.length) * timePerWord, segmentStartTime + duration);
        
        const words: Word[] = wordGroup.map((token: string, wordIdx: number) => {
          const wordStart = groupStart + wordIdx * (timePerWord);
          const wordEnd = wordIdx === wordGroup.length - 1
            ? groupEnd
            : groupStart + (wordIdx + 1) * timePerWord;
          return {
            text: token,
            start: wordStart,
            end: wordEnd,
          };
        });
        
        captions.push({
          id: captions.length + 1,
          start: groupStart,
          end: groupEnd,
          text: wordGroup.join(" "),
          words: words.length > 0 ? words : undefined,
        });
      }
    }
    
    logger.info("Created captions from text fallback", {
      captionCount: captions.length,
      textLength: result.text.length,
      segmentStartTime,
    });
  } else {
    logger.warn("Hugging Face response has no text or chunks", {
      hasText: !!result.text,
      hasChunks: !!result.chunks,
      hasWords: !!result.words,
      resultKeys: Object.keys(result || {}),
      segmentStartTime,
      rawResult: JSON.stringify(result).substring(0, 500), // Log first 500 chars for debugging
    });
    // Return empty array - caller will handle this
  }

  logger.info("Processed Hugging Face response", {
    captionCount: captions.length,
    segmentStartTime,
    totalWords: captions.reduce((sum, c) => sum + (c.words?.length || 0), 0),
  });

  return captions;
}

/**
 * Generate captions using Hugging Face Inference API (FREE)
 * Uses openai/whisper-large-v3 model
 * Processes long videos by splitting into segments
 */
async function generateCaptionsHuggingFace(
  videoFile: File | Buffer,
  language?: "hi" | "en" | "auto"
): Promise<Caption[]> {
  let apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  // Clean up the API key - remove quotes and trim whitespace
  apiKey = apiKey.trim();
  // Remove surrounding quotes if present
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || 
      (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1).trim();
  }

  // Validate key format
  if (!apiKey.startsWith("hf_")) {
    throw new Error(
      `Invalid HUGGINGFACE_API_KEY format. Key should start with "hf_". ` +
      `Current key starts with: "${apiKey.substring(0, 5)}...". ` +
      `Get your key from https://huggingface.co/settings/tokens`
    );
  }

  if (apiKey.length < 20) {
    throw new Error(
      `HUGGINGFACE_API_KEY appears to be too short. ` +
      `Make sure you copied the full key from https://huggingface.co/settings/tokens`
    );
  }

  logger.info("Using Hugging Face API key", {
    keyLength: apiKey.length,
    keyPrefix: apiKey.substring(0, 8) + "...",
    keyStartsWithHF: apiKey.startsWith("hf_"),
  });

  const model = "openai/whisper-large-v3";
  const apiUrl = `https://router.huggingface.co/hf-inference/models/${model}`;

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "hf-segments-"));
  let audioFilePath: string | null = null;

  try {
    logger.info("Using Hugging Face Whisper API", {
      model,
      language: language || "auto",
    });

    // Prepare language parameter
    const languageParam = language === "auto" ? undefined : language;

    // Step 1: Convert video to audio and save to temp file
    const audioPayload = await prepareAudioPayloadForHuggingFace(videoFile);
    audioFilePath = path.join(tempDir, `full-audio-${randomUUID()}.wav`);
    await fs.writeFile(audioFilePath, audioPayload.buffer);

    // Step 2: Get audio duration
    const duration = await getAudioDuration(audioFilePath);
    logger.info("Audio duration determined", { duration, seconds: duration });

    // Step 3: Split into segments if longer than 30 seconds
    const SEGMENT_DURATION = 30; // 30 seconds per segment
    const allCaptions: Caption[] = [];
    let failedSegmentsCount = 0;

    if (duration > SEGMENT_DURATION) {
      logger.info("Audio is longer than segment duration, splitting into segments", {
        duration,
        segmentDuration: SEGMENT_DURATION,
      });

      const segments = await splitAudioIntoSegments(audioFilePath, SEGMENT_DURATION, tempDir);

      logger.info("Processing segments", { segmentCount: segments.length });

      // Process each segment with retry logic
      const failedSegments: Array<{ index: number; segment: typeof segments[0]; error: Error }> = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        logger.info(`Processing segment ${i + 1}/${segments.length}`, {
          startTime: segment.startTime,
          endTime: segment.endTime,
          segmentDuration: segment.endTime - segment.startTime,
        });

        let segmentCaptions: Caption[] = [];
        let segmentSuccess = false;
        const maxSegmentRetries = 3;

        // Retry the entire segment if it fails
        for (let retryAttempt = 0; retryAttempt < maxSegmentRetries; retryAttempt++) {
          try {
            if (retryAttempt > 0) {
              logger.info(`Retrying segment ${i + 1} (attempt ${retryAttempt + 1}/${maxSegmentRetries})`);
              await new Promise((resolve) => setTimeout(resolve, 2000 * retryAttempt)); // Exponential backoff
            }

            const segmentBuffer = await fs.readFile(segment.path);
            const actualSegmentDuration = segment.endTime - segment.startTime;
            segmentCaptions = await processAudioSegment(
              segmentBuffer,
              segment.startTime,
              apiKey,
              languageParam,
              model,
              apiUrl,
              3, // Max retries per API call
              actualSegmentDuration // Pass actual segment duration
            );

            // Validate we got captions
            if (!segmentCaptions || segmentCaptions.length === 0) {
              throw new Error(`No captions returned for segment ${i + 1}`);
            }

            // Validate captions have text
            const hasText = segmentCaptions.some(c => c.text && c.text.trim() !== "");
            if (!hasText) {
              throw new Error(`Segment ${i + 1} returned captions with no text`);
            }

            segmentSuccess = true;
            break; // Success, exit retry loop
          } catch (segmentError) {
            const error = segmentError as Error;
            logger.error(`Segment ${i + 1} attempt ${retryAttempt + 1} failed`, error, {
              segmentStart: segment.startTime,
              segmentEnd: segment.endTime,
              willRetry: retryAttempt < maxSegmentRetries - 1,
            });

            if (retryAttempt === maxSegmentRetries - 1) {
              // Last attempt failed, record it
              failedSegments.push({ index: i, segment, error });
              failedSegmentsCount++;
            }
          }
        }

        if (segmentSuccess && segmentCaptions.length > 0) {
          // Adjust caption IDs to be sequential across all segments
          segmentCaptions.forEach((caption) => {
            caption.id = allCaptions.length + 1;
            allCaptions.push(caption);
          });

          const totalWords = segmentCaptions.reduce((sum, c) => sum + (c.words?.length || 0), 0);
          logger.info(`Segment ${i + 1} completed successfully`, {
            captionCount: segmentCaptions.length,
            wordCount: totalWords,
            totalCaptions: allCaptions.length,
            segmentStart: segment.startTime,
            segmentEnd: segment.endTime,
          });
        } else {
          logger.error(`Segment ${i + 1} failed after all retries`, undefined, {
            segmentStart: segment.startTime,
            segmentEnd: segment.endTime,
            segmentDuration: segment.endTime - segment.startTime,
          });
        }
      }

      // Log summary of failed segments
      if (failedSegments.length > 0) {
        logger.error(`${failedSegments.length} segment(s) failed after retries`, undefined, {
          failedSegmentIndices: failedSegments.map(fs => fs.index + 1),
          totalSegments: segments.length,
          successfulSegments: segments.length - failedSegments.length,
        });
        
        // If too many segments failed, throw an error
        const failureRate = failedSegments.length / segments.length;
        if (failureRate > 0.5) {
          throw new Error(
            `Too many segments failed (${failedSegments.length}/${segments.length}). ` +
            `This may indicate an API issue. Please check your HUGGINGFACE_API_KEY and try again.`
          );
        }
      }

      // Validate we got captions from at least some segments
      if (allCaptions.length === 0) {
        throw new Error(
          `No captions generated from any segment. ` +
          `This may indicate an API issue or the video has no speech. ` +
          `Please check your HUGGINGFACE_API_KEY and try again.`
        );
      }
    } else {
      // Process entire audio as single segment
      logger.info("Processing audio as single segment", { duration });
      
      let segmentCaptions: Caption[] = [];
      const maxRetries = 3;
      
      for (let retryAttempt = 0; retryAttempt < maxRetries; retryAttempt++) {
        try {
          if (retryAttempt > 0) {
            logger.info(`Retrying single segment (attempt ${retryAttempt + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 2000 * retryAttempt));
          }
          
          const segmentBuffer = await fs.readFile(audioFilePath);
          segmentCaptions = await processAudioSegment(
            segmentBuffer,
            0,
            apiKey,
            languageParam,
            model,
            apiUrl,
            3, // Max retries per API call
            duration // Pass actual video duration
          );
          
          // Validate we got captions
          if (!segmentCaptions || segmentCaptions.length === 0) {
            throw new Error("No captions returned for audio");
          }
          
          // Validate captions have text
          const hasText = segmentCaptions.some(c => c.text && c.text.trim() !== "");
          if (!hasText) {
            throw new Error("Returned captions have no text");
          }
          
          break; // Success
        } catch (error) {
          logger.error(`Single segment attempt ${retryAttempt + 1} failed`, error as Error, {
            willRetry: retryAttempt < maxRetries - 1,
          });
          
          if (retryAttempt === maxRetries - 1) {
            throw new Error(
              `Failed to generate captions after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      }
      
      allCaptions.push(...segmentCaptions);
      
      const totalWords = allCaptions.reduce((sum, c) => sum + (c.words?.length || 0), 0);
      logger.info("Single segment processing completed", {
        captionCount: allCaptions.length,
        wordCount: totalWords,
      });
    }

    // Sort captions by start time to ensure chronological order
    allCaptions.sort((a, b) => a.start - b.start);
    
    // Re-number captions after sorting
    allCaptions.forEach((caption, index) => {
      caption.id = index + 1;
    });

    // CRITICAL: Validate full video coverage
    const firstCaptionTime = allCaptions.length > 0 ? allCaptions[0].start : null;
    const lastCaptionTime = allCaptions.length > 0 ? allCaptions[allCaptions.length - 1].end : null;
    const videoCoverage = duration > 0 && lastCaptionTime 
      ? ((lastCaptionTime / duration) * 100) 
      : 0;
    
    // If coverage is low, warn but don't fail (API may have only returned partial transcription)
    if (videoCoverage < 50 && duration > 10) {
      logger.warn("⚠️ WARNING: Low video coverage - transcription may be incomplete", {
        videoDuration: duration,
        lastCaptionTime,
        coveragePercentage: `${videoCoverage.toFixed(1)}%`,
        captionCount: allCaptions.length,
        message: "Hugging Face API may have only returned partial transcription. Check audio quality and API response.",
      });
    }

    // Ensure captions start from 0 and cover as much as possible
    if (allCaptions.length > 0 && firstCaptionTime !== null && firstCaptionTime > 0.1) {
      logger.info("Adjusting first caption to start at 0", {
        originalStart: firstCaptionTime,
        newStart: 0,
      });
      // Adjust first caption to start at 0 if it starts later
      const timeOffset = firstCaptionTime;
      allCaptions.forEach(caption => {
        caption.start = Math.max(0, caption.start - timeOffset);
        caption.end = Math.max(caption.start + 0.1, caption.end - timeOffset);
        if (caption.words) {
          caption.words.forEach(word => {
            word.start = Math.max(0, word.start - timeOffset);
            word.end = Math.max(word.start + 0.01, word.end - timeOffset);
          });
        }
      });
    }

    // Final comprehensive summary (recalculate after potential adjustments)
    const totalWords = allCaptions.reduce((sum, c) => sum + (c.words?.length || 0), 0);
    const totalTextLength = allCaptions.reduce((sum, c) => sum + (c.text?.length || 0), 0);
    const finalFirstCaptionTime = allCaptions.length > 0 ? allCaptions[0].start : null;
    const finalLastCaptionTime = allCaptions.length > 0 ? allCaptions[allCaptions.length - 1].end : null;
    const coveragePercentage = duration > 0 && finalLastCaptionTime ? ((finalLastCaptionTime / duration) * 100).toFixed(1) : "0";

    // Log first few and last few captions for debugging
    const firstFew = allCaptions.slice(0, Math.min(3, allCaptions.length));
    const lastFew = allCaptions.slice(Math.max(0, allCaptions.length - 3));

    logger.info("=== HUGGING FACE TRANSCRIPTION COMPLETE ===", {
      captionCount: allCaptions.length,
      totalWords,
      totalTextLength,
      videoDuration: duration,
      firstCaptionTime: finalFirstCaptionTime,
      lastCaptionTime: finalLastCaptionTime,
      coveragePercentage: `${coveragePercentage}%`,
      language: language || "auto",
      segmentCount: duration > SEGMENT_DURATION ? Math.ceil(duration / SEGMENT_DURATION) : 1,
      failedSegments: failedSegmentsCount,
      firstFewCaptions: firstFew.map(c => ({
        id: c.id,
        start: c.start.toFixed(2),
        end: c.end.toFixed(2),
        text: c.text.substring(0, 30) + (c.text.length > 30 ? "..." : ""),
      })),
      lastFewCaptions: lastFew.map(c => ({
        id: c.id,
        start: c.start.toFixed(2),
        end: c.end.toFixed(2),
        text: c.text.substring(0, 30) + (c.text.length > 30 ? "..." : ""),
      })),
    });

    // Warn if coverage is low (already checked above, but log again for visibility)
    if (duration > 0 && finalLastCaptionTime && (finalLastCaptionTime / duration) < 0.5) {
      logger.warn("Low transcription coverage detected", {
        coveragePercentage: `${coveragePercentage}%`,
        videoDuration: duration,
        lastCaptionTime: finalLastCaptionTime,
        captionCount: allCaptions.length,
      });
    }

    // Warn if very few captions for a long video
    if (duration > 10 && allCaptions.length < 5) {
      logger.warn("Very few captions generated for video duration", {
        captionCount: allCaptions.length,
        videoDuration: duration,
        expectedMinimum: Math.ceil(duration / 3), // Expect at least 1 caption per 3 seconds
      });
    }

    return allCaptions;
  } catch (error) {
    logger.error("Hugging Face transcription failed", error as Error, {
      language: language || "auto",
    });
    throw error;
  } finally {
    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
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

  logger.info("Generating captions", {
    provider,
    hasHuggingFace: !!process.env.HUGGINGFACE_API_KEY,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    language: language || "auto",
  });

  try {
    if (provider === "huggingface") {
      logger.info("Using Hugging Face provider");
      return await generateCaptionsHuggingFace(videoFile, language);
    } else {
      logger.info("Using OpenAI provider");
      return await generateCaptionsOpenAI(videoFile, language);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Primary STT provider failed", error as Error, {
      provider,
      errorMessage,
    });

    // Only fallback if explicitly configured to do so
    // If user has Hugging Face configured, don't auto-fallback to OpenAI (which is paid)
    // Only fallback if OpenAI was explicitly selected and fails
    if (provider === "openai" && process.env.HUGGINGFACE_API_KEY) {
      logger.warn("OpenAI failed, falling back to Hugging Face", {
        originalError: errorMessage,
      });
      try {
        return await generateCaptionsHuggingFace(videoFile, language);
      } catch (fallbackError) {
        logger.error("Both STT providers failed", fallbackError as Error);
        throw new Error(
          `Both STT providers failed. OpenAI: ${errorMessage}. Hugging Face: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`
        );
      }
    }
    
    // Don't auto-fallback from Hugging Face to OpenAI (paid service)
    // If Hugging Face fails, show the error instead of silently switching to paid service
    if (provider === "huggingface") {
      const openAIKey = process.env.OPENAI_API_KEY;
      const hasValidOpenAI = isValidApiKey(openAIKey, "sk-");
      
      logger.error(
        "Hugging Face failed. Not falling back to OpenAI to avoid unexpected charges.",
        undefined,
        {
          error: errorMessage,
          hasOpenAIKey: !!openAIKey,
          hasValidOpenAI,
        }
      );
      
      let errorMsg = `Hugging Face transcription failed: ${errorMessage}. `;
      errorMsg += `Please check your HUGGINGFACE_API_KEY and try again. `;
      
      if (openAIKey && !hasValidOpenAI) {
        errorMsg += `Note: You have OPENAI_API_KEY set to a placeholder value (${openAIKey.substring(0, 20)}...). ` +
          `Remove it from .env.local or set a valid OpenAI key if you want to use OpenAI.`;
      } else if (hasValidOpenAI) {
        errorMsg += `If you want to use OpenAI instead, set STT_PROVIDER=openai in .env.local.`;
      }
      
      throw new Error(errorMsg);
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

