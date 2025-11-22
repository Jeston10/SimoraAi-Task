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

    // Support JSON { videoUrl } to fetch large files server-side
    const contentType = request.headers.get("content-type") || "";
    let videoFile: File | Buffer | null = null;
    let language: "hi" | "en" | "auto" = "auto";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      language = (body.language as any) || "auto";
      const videoUrl = body.videoUrl as string | undefined;
      if (!videoUrl) {
        return NextResponse.json({ success: false, message: "Missing videoUrl in JSON payload" }, { status: 400 });
      }
      try {
        const res = await fetch(videoUrl);
        if (!res.ok) {
          return NextResponse.json({ success: false, message: `Failed to fetch video from URL (${res.status})` }, { status: 400 });
        }
        const ab = await res.arrayBuffer();
        videoFile = Buffer.from(ab);
      } catch (err) {
        return NextResponse.json({ success: false, message: "Failed to download video from URL", error: err instanceof Error ? err.message : String(err) }, { status: 400 });
      }
    } else {
      const formData = await request.formData();
      videoFile = formData.get("video") as File | null;
      language = (formData.get("language") as "hi" | "en" | "auto") || "auto";
    }

    if (!videoFile) {
      return NextResponse.json<CaptionGenerationResponse>({ success: false, message: "No video file provided" }, { status: 400 });
    }

    const isBuffer = !(typeof (videoFile as any).type === "string");
    const fileMime = isBuffer ? undefined : (videoFile as File).type;
    const fileName = isBuffer ? "upload.mp4" : (videoFile as File).name;

    if ((fileMime && !fileMime.includes("video/mp4")) && !(fileName && fileName.toLowerCase().endsWith(".mp4"))) {
      return NextResponse.json<CaptionGenerationResponse>({ success: false, message: "File must be an MP4 video" }, { status: 400 });
    }

    logger.info("Alternate captions: starting generation", { fileName, fileSize: isBuffer ? (videoFile as Buffer).byteLength : (videoFile as File).size, language });

    const captions = await generateCaptionsWithRetry(videoFile as any, language);

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
