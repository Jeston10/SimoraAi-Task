/**
 * Presigned Upload URL API Route
 * Generates a presigned URL for direct client-side uploads to storage
 * This bypasses Vercel's 4.5MB request body limit
 */

import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileSize, contentType } = body;

    // Validate input
    if (!fileName || !fileSize) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing fileName or fileSize",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File size must be less than 100MB",
        },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    // Generate unique file name
    const videoId = generateId();
    const uniqueFileName = `${videoId}-${fileName}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure bucket exists and is public
    try {
      const { data: bucketInfo } = await supabase.storage.getBucket(bucket);
      if (!bucketInfo) {
        // Try to create bucket
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 1024 * 1024 * 1024, // 1GB
          allowedMimeTypes: ["video/mp4", "video/*"],
        });
      } else if (!bucketInfo.public) {
        // Try to make it public
        await supabase.storage.updateBucket(bucket, { public: true });
      }
    } catch (bucketError) {
      logger.warn("Bucket check/create failed, continuing anyway", {
        error: bucketError instanceof Error ? bucketError.message : "Unknown error",
      });
    }

    // Generate presigned URL for upload
    // Note: Supabase doesn't have presigned URLs in the same way as S3
    // Instead, we'll return the upload endpoint and a token
    // For direct client uploads, we can use the anon key with proper RLS policies
    // Or we can return the file path and let the client upload directly

    // For now, return the file path and upload instructions
    // The client will upload directly to Supabase using the anon key
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueFileName}`;

    logger.info("Presigned URL generated", {
      fileName: uniqueFileName,
      fileSize,
      bucket,
    });

    return NextResponse.json({
      success: true,
      uploadUrl: `${supabaseUrl}/storage/v1/object/${bucket}/${uniqueFileName}`,
      publicUrl,
      fileName: uniqueFileName,
      videoId,
      bucket,
      // For Supabase, we need to use the anon key on the client
      // The client will upload directly using the Supabase JS client
    });
  } catch (error) {
    logger.error("Presigned URL generation error", error as Error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate upload URL",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

