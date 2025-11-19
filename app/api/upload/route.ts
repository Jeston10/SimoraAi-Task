/**
 * Video Upload API Route
 * Handles MP4 video file uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { generateId, formatFileSize } from "@/lib/utils";
import { uploadToStorage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import type { VideoUploadResponse } from "@/types";

// Disable body parsing, we'll handle it manually for file uploads
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel's serverless function limit is 4.5MB
// For larger files, use direct Supabase uploads from the client
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (slightly below Vercel's 4.5MB limit)

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables early to prevent runtime errors
    const hasStorage = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasStorage && !process.env.VERCEL_BLOB_STORAGE_TOKEN) {
      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: "Storage provider not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or VERCEL_BLOB_STORAGE_TOKEN in Vercel environment variables.",
        },
        { status: 500 }
      );
    }

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
          message: `File size (${formatFileSize(file.size)}) exceeds the server upload limit of ${formatFileSize(MAX_FILE_SIZE)}. ` +
            `For larger files, please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for direct uploads, ` +
            `or compress your video file.`,
        },
        { status: 413 } // 413 Payload Too Large
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

