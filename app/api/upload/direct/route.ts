/**
 * Direct Upload API Route
 * Handles large file uploads by streaming to Supabase using service role key
 * This bypasses both Vercel's 4.5MB limit and Supabase RLS policies
 */

import { NextRequest, NextResponse } from "next/server";
import { generateId, formatFileSize } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";
import type { VideoUploadResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large files

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: "Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
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
          message: `File size (${formatFileSize(file.size)}) exceeds the limit of ${formatFileSize(MAX_FILE_SIZE)}`,
        },
        { status: 400 }
      );
    }

    // Generate unique ID for the video
    const videoId = generateId();
    const fileName = `${videoId}-${file.name}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure bucket exists and is public
    try {
      const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket);
      
      if (bucketError || !bucketInfo) {
        // Try to create bucket
        logger.info("Creating Supabase bucket", { bucket });
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 1024 * 1024 * 1024, // 1GB
          allowedMimeTypes: ["video/mp4", "video/*"],
        });
        
        if (createError) {
          const errorMsg = createError.message?.toLowerCase() || String(createError).toLowerCase();
          if (!errorMsg.includes("already exists") && !errorMsg.includes("duplicate")) {
            logger.error("Failed to create bucket", createError as Error, { bucket });
          }
        }
      } else if (!bucketInfo.public) {
        // Try to make it public
        logger.info("Making bucket public", { bucket });
        await supabase.storage.updateBucket(bucket, { public: true });
      }
    } catch (bucketError) {
      logger.warn("Bucket check/create failed, continuing anyway", {
        error: bucketError instanceof Error ? bucketError.message : "Unknown error",
      });
    }

    logger.info("Starting direct upload to Supabase", {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      bucket,
    });

    // Upload to Supabase using service role key (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "video/mp4",
      });

    if (uploadError) {
      logger.error("Failed to upload to Supabase", uploadError as Error, {
        fileName,
        bucket,
        fileSize: file.size,
      });
      return NextResponse.json<VideoUploadResponse>(
        {
          success: false,
          message: `Failed to upload file: ${uploadError.message}`,
          error: uploadError.message,
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    logger.info("File uploaded successfully to Supabase", {
      fileName,
      videoUrl: urlData.publicUrl,
      fileSize: file.size,
    });

    return NextResponse.json<VideoUploadResponse>({
      success: true,
      videoId,
      videoUrl: urlData.publicUrl,
      message: "Video uploaded successfully",
    });
  } catch (error) {
    logger.error("Direct upload API error", error as Error);
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

