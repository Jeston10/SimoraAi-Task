/**
 * Generate Signed Upload URL API Route
 * Returns a signed upload URL + token so the client can upload directly to Supabase
 * This keeps large files off Vercel functions and bypasses Supabase RLS
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateId, formatFileSize } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileSize, contentType } = body ?? {};

    if (!fileName || !fileSize) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing fileName or fileSize",
        },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `File size (${formatFileSize(fileSize)}) exceeds the limit of ${formatFileSize(
            MAX_FILE_SIZE
          )}`,
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure bucket exists & public
    try {
      const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket);
      if (bucketError || !bucketInfo) {
        logger.info("Creating Supabase bucket (signed upload)", { bucket });
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 1024 * 1024 * 1024,
          allowedMimeTypes: ["video/mp4", "video/*"],
        });
      } else if (!bucketInfo.public) {
        logger.info("Updating Supabase bucket to public (signed upload)", { bucket });
        await supabase.storage.updateBucket(bucket, { public: true });
      }
    } catch (bucketError) {
      logger.warn("Bucket check/create failed (signed upload)", {
        error: bucketError instanceof Error ? bucketError.message : "Unknown error",
        bucket,
      });
    }

    const videoId = generateId();
    const safeFileName = fileName.replace(/\s+/g, "_");
    const filePath = `${videoId}-${safeFileName}`;

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, { upsert: true });

    if (signedError || !signedData) {
      logger.error("Failed to create signed upload url", signedError as Error, { bucket, filePath });
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create signed upload URL",
          error: signedError?.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    logger.info("Signed upload URL generated", {
      fileName: safeFileName,
      filePath,
      bucket,
    });

    return NextResponse.json({
      success: true,
      videoId,
      bucket,
      filePath,
      publicUrl: urlData.publicUrl,
      signedUrl: signedData.signedUrl,
      token: (signedData as any).token, // Upload token used by uploadToSignedUrl
      expiresIn: 3600,
      contentType: contentType || "video/mp4",
    });
  } catch (error) {
    logger.error("Signed upload API error", error as Error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create signed upload URL",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

