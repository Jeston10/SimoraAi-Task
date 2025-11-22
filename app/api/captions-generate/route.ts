/**
 * Alternate Caption Generation API Route
 * Single-segment path to avoid potential deployment/path-level blocking
 */

import { NextRequest, NextResponse } from "next/server";
import { generateCaptionsWithRetry } from "@/lib/stt";
import { validateCaptions } from "@/lib/captions";
import { logger } from "@/lib/logger";
import type { CaptionGenerationResponse } from "@/types";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Captions generate (alternate) available" });
}

export async function POST(request: NextRequest) {
  try {
    const hasHuggingFace = !!process.env.HUGGINGFACE_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasHuggingFace && !hasOpenAI) {
      return NextResponse.json<CaptionGenerationResponse>({ success: false, message: "No STT provider configured." }, { status: 500 });
    }

    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const language = (formData.get("language") as "hi" | "en" | "auto") || "auto";

    if (!videoFile) {
      return NextResponse.json<CaptionGenerationResponse>({ success: false, message: "No video file provided" }, { status: 400 });
    }

    logger.info("Alternate captions: starting generation", { fileName: videoFile.name, fileSize: videoFile.size, language });

    const captions = await generateCaptionsWithRetry(videoFile, language);

    const validation = validateCaptions(captions);
    if (!validation.valid) {
      logger.error("Alternate caption validation failed", undefined, { errors: validation.errors });
      return NextResponse.json<CaptionGenerationResponse>({ success: false, message: "Generated captions failed validation", error: validation.errors.join(", ") }, { status: 500 });
    }

    return NextResponse.json<CaptionGenerationResponse>({ success: true, captions, language: language === "auto" ? "auto" : language, message: `Successfully generated ${captions.length} captions (alternate)` });
  } catch (error) {
    logger.error("Alternate caption generation error", error as Error);
    return NextResponse.json<CaptionGenerationResponse>({ success: false, message: "Failed to generate captions (alternate)", error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
