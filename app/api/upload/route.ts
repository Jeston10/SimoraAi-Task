/**
 * Video Upload API Route
 * Handles MP4 video file uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";
import { uploadToStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import type { VideoUploadResponse } from "@/types";

// Disable body parsing, we'll handle it manually for file uploads
export const runtime = "nodejs";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: "No file provided",
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes("video/mp4") && !file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: "File must be an MP4 video",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: "File size must be less than 100MB",
        },
        { status: 400 }
      );
    }

    // Generate unique ID for the video
    const videoId = generateId();
    const fileName = `${videoId}-${file.name}`;

    // Upload to Vercel Blob Storage
    logger.info("Starting video upload", {
      fileName,
      fileSize: file.size,
      fileType: file.type,
    });

    let videoUrl: string;
    let fileSize: number;

    try {
      const uploadResult = await uploadToStorage(fileName, file);
      videoUrl = uploadResult.url;
      fileSize = uploadResult.size;

      logger.info("Video uploaded successfully", {
        fileName,
        videoUrl,
        fileSize,
      });
    } catch (error) {
      logger.error("Failed to upload video to storage", error as Error, {
        fileName,
        fileSize: file.size,
      });

      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: "Failed to upload file to storage",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // For now, we'll return basic metadata
    // In a full implementation, you'd extract video metadata server-side
    // For this phase, we'll let the client extract it

    return NextResponse.json<VideoUploadResponse>({
      success: true,
      videoId,
      videoUrl,
      message: "Video uploaded successfully",
    });
  } catch (error) {
    logger.error("Upload API error", error as Error);
    return NextResponse.json<VideoUploadResponse>(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

