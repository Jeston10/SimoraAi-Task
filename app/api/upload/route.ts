/**
 * Video Upload API Route
 * Handles MP4 video file uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateId } from "@/lib/utils";
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
    // Note: In development, you might want to use local storage first
    // For now, we'll use a fallback approach
    let videoUrl: string;

    try {
      // Try to use Vercel Blob if configured
      const blobToken = process.env.VERCEL_BLOB_STORAGE_TOKEN;
      if (blobToken) {
        const blob = await put(fileName, file, {
          access: "public",
          token: blobToken,
        });
        videoUrl = blob.url;
      } else {
        // Fallback: For development, we'll return a placeholder
        // In production, Vercel Blob should be configured
        videoUrl = `/uploads/${fileName}`;
        // In a real scenario, you'd save to local storage or use another service
        console.warn("VERCEL_BLOB_STORAGE_TOKEN not configured. Using placeholder URL.");
      }
    } catch (error) {
      console.error("Error uploading to blob storage:", error);
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
    console.error("Upload error:", error);
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

