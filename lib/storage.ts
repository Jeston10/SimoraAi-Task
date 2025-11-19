/**
 * Storage Utility
 * Supports multiple storage providers:
 * - Supabase Storage (FREE, recommended, open-source)
 * - Vercel Blob Storage (paid, fallback)
 * Includes proper error handling and fallback mechanisms
 */

import { put, del, head } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

export interface StorageConfig {
  token?: string;
  url?: string;
}

// Storage provider type
type StorageProvider = "supabase" | "vercel" | "auto";

// Get storage provider preference
const getStorageProvider = (): StorageProvider => {
  const provider = process.env.STORAGE_PROVIDER || "auto";
  if (provider === "supabase" || provider === "vercel") {
    return provider;
  }
  // Auto-detect: prefer Supabase if available, fallback to Vercel
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "supabase";
  }
  if (process.env.VERCEL_BLOB_STORAGE_TOKEN) {
    return "vercel";
  }
  return "auto"; // Will use placeholder
};

// Initialize Supabase client
const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }
  return createClient(url, key);
};

/**
 * Ensure Supabase bucket exists (creates if missing)
 */
const ensureSupabaseBucket = async (bucket: string) => {
  const supabase = getSupabaseClient();

  // First, try to get the bucket
  const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket);

  if (bucketInfo) {
    // Bucket exists, check if it's public
    if (!bucketInfo.public) {
      logger.warn("Bucket exists but is not public. Attempting to update...", { bucket });
      // Try to update bucket to be public
      const { error: updateError } = await supabase.storage.updateBucket(bucket, {
        public: true,
      });
      if (updateError) {
        logger.warn("Could not update bucket to public. You may need to do this manually in Supabase Dashboard", {
          bucket,
          error: updateError.message,
        });
      } else {
        logger.info("Bucket updated to public", { bucket });
      }
    }
    return supabase;
  }

  // If bucket not found, attempt to create it
  if (bucketError) {
    const errorMsg = bucketError.message?.toLowerCase() || String(bucketError).toLowerCase();
    if (!errorMsg.includes("not found") && !errorMsg.includes("does not exist")) {
      logger.error("Error checking bucket", bucketError as Error, { bucket });
      throw bucketError;
    }
  }

  // Create bucket as public
  logger.info("Creating Supabase bucket", { bucket });
  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 1024 * 1024 * 1024, // 1GB limit to match free tier
    allowedMimeTypes: ["video/mp4", "video/*"], // Allow video files
  });

  if (createError) {
    const errorMsg = createError.message?.toLowerCase() || String(createError).toLowerCase();
    if (!errorMsg.includes("already exists") && !errorMsg.includes("duplicate")) {
      logger.error("Failed to create bucket", createError as Error, { bucket });
      throw new Error(
        `Failed to create bucket "${bucket}": ${createError.message}. ` +
        `Please create it manually in Supabase Dashboard > Storage and make it public.`
      );
    } else {
      logger.info("Bucket already exists (created by another process)", { bucket });
    }
  } else {
    logger.info("Supabase bucket created successfully", { bucket });
  }

  return supabase;
};

/**
 * Upload file to Supabase Storage (FREE, open-source)
 */
async function uploadToSupabase(
  fileName: string,
  file: File | Buffer,
  _config?: StorageConfig
): Promise<{ url: string; size: number }> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

  try {
    const supabase = await ensureSupabaseBucket(bucket);
    logger.info("Uploading file to Supabase Storage", {
      fileName,
      bucket,
      size: file instanceof File ? file.size : file.length,
    });

    // Convert to Blob if needed
    let fileBlob: Blob;
    if (file instanceof File) {
      fileBlob = file;
    } else {
      // Convert Buffer to Uint8Array for Blob
      const uint8Array = new Uint8Array(file);
      fileBlob = new Blob([uint8Array], { type: "video/mp4" });
    }

    // Upload to Supabase
    const { data: uploadData, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBlob, {
        cacheControl: "3600",
        upsert: true, // Allow overwriting existing files
        contentType: fileBlob.type || "video/mp4",
      });

    if (error) {
      // Provide more detailed error message
      const errorMessage = error.message || String(error);
      const errorCode = (error as any).statusCode || (error as any).code;
      
      logger.error("Supabase upload error", error as Error, {
        fileName,
        bucket,
        errorMessage,
        errorCode,
        fileSize: file instanceof File ? file.size : file.length,
      });
      
      // Check for specific error types
      const errorLower = errorMessage.toLowerCase();
      
      if (errorLower.includes("bucket not found") || errorLower.includes("not found") || errorCode === 404) {
        throw new Error(
          `Bucket "${bucket}" not found. ` +
          `Please create it in Supabase Dashboard > Storage and make it public. ` +
          `Or check that SUPABASE_STORAGE_BUCKET environment variable matches your bucket name.`
        );
      }
      
      if (
        errorLower.includes("row-level security") ||
        errorLower.includes("permission denied") ||
        errorLower.includes("access denied") ||
        errorLower.includes("policy") ||
        errorCode === 403
      ) {
        throw new Error(
          `Access denied to bucket "${bucket}". ` +
          `This is usually caused by Row Level Security (RLS) policies. ` +
          `Solutions:\n` +
          `1. Make the bucket public: Supabase Dashboard > Storage > ${bucket} > Settings > Make Public\n` +
          `2. Or disable RLS for this bucket (not recommended for production)\n` +
          `3. Or add a policy allowing service_role key access`
        );
      }
      
      if (errorLower.includes("duplicate") || errorLower.includes("already exists") || errorCode === 409) {
        // Try with upsert
        logger.info("File exists, retrying with upsert", { fileName });
        const { error: retryError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileBlob, {
            cacheControl: "3600",
            upsert: true,
            contentType: fileBlob.type || "video/mp4",
          });
        if (retryError) {
          throw new Error(`File "${fileName}" already exists and could not be overwritten: ${retryError.message}`);
        }
      }
      
      if (errorLower.includes("file too large") || errorCode === 413) {
        throw new Error(`File is too large. Supabase free tier limit is 1GB per file.`);
      }
      
      // Generic error with full details
      throw new Error(
        `Supabase upload failed: ${errorMessage} ` +
        `(Code: ${errorCode || "unknown"}). ` +
        `Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local`
      );
    }
    
    logger.info("File uploaded successfully", {
      fileName,
      path: uploadData?.path,
      bucket,
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const fileSize = file instanceof File ? file.size : file.length;

    logger.info("File uploaded to Supabase successfully", {
      fileName,
      url: urlData.publicUrl,
      size: fileSize,
    });

    return {
      url: urlData.publicUrl,
      size: fileSize,
    };
  } catch (error) {
    logger.error("Failed to upload file to Supabase Storage", error as Error, {
      fileName,
      bucket,
    });
    throw error;
  }
}

/**
 * Upload file to Vercel Blob Storage
 */
async function uploadToVercel(
  fileName: string,
  file: File | Buffer,
  config?: StorageConfig
): Promise<{ url: string; size: number }> {
  const token = config?.token || process.env.VERCEL_BLOB_STORAGE_TOKEN;

  if (!token) {
    throw new Error("VERCEL_BLOB_STORAGE_TOKEN not configured");
  }

  try {
    logger.info("Uploading file to Vercel Blob Storage", {
      fileName,
      size: file instanceof File ? file.size : file.length,
    });

    const blob = await put(fileName, file, {
      access: "public",
      token,
    });

    const fileSize = file instanceof File ? file.size : file.length;

    logger.info("File uploaded to Vercel successfully", {
      fileName,
      url: blob.url,
      size: fileSize,
    });

    return {
      url: blob.url,
      size: fileSize,
    };
  } catch (error) {
    logger.error("Failed to upload file to Vercel Blob Storage", error as Error, {
      fileName,
    });
    throw error;
  }
}

/**
 * Upload file to storage
 * Automatically selects provider based on configuration
 */
export async function uploadToStorage(
  fileName: string,
  file: File | Buffer,
  config?: StorageConfig
): Promise<{ url: string; size: number }> {
  const provider = getStorageProvider();

  // If no provider configured, use placeholder
  if (provider === "auto" && !process.env.SUPABASE_URL && !process.env.VERCEL_BLOB_STORAGE_TOKEN) {
    logger.warn("No storage provider configured", {
      fileName,
      fallback: "using placeholder URL",
    });
    return {
      url: `/uploads/${fileName}`,
      size: file instanceof File ? file.size : file.length,
    };
  }

  try {
    if (provider === "supabase" || (provider === "auto" && process.env.SUPABASE_URL)) {
      return await uploadToSupabase(fileName, file, config);
    } else {
      return await uploadToVercel(fileName, file, config);
    }
  } catch (error) {
    // Try fallback provider
    if (provider === "supabase" && process.env.VERCEL_BLOB_STORAGE_TOKEN) {
      logger.warn("Supabase failed, falling back to Vercel", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return await uploadToVercel(fileName, file, config);
    } else if (provider === "vercel" && process.env.SUPABASE_URL) {
      logger.warn("Vercel failed, falling back to Supabase", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return await uploadToSupabase(fileName, file, config);
    }

    // If all providers fail, return placeholder
    logger.error("All storage providers failed, using placeholder", error as Error);
    return {
      url: `/uploads/${fileName}`,
      size: file instanceof File ? file.size : file.length,
    };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(
  url: string,
  config?: StorageConfig
): Promise<boolean> {
  const provider = getStorageProvider();

  try {
    if (provider === "supabase" || (provider === "auto" && process.env.SUPABASE_URL)) {
      const supabase = getSupabaseClient();
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";
      
      // Extract file path from URL
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage.from(bucket).remove([fileName]);
      
      if (error) {
        throw error;
      }

      logger.info("File deleted from Supabase storage", { url });
      return true;
    } else {
      const token = config?.token || process.env.VERCEL_BLOB_STORAGE_TOKEN;
      if (!token) {
        logger.warn("VERCEL_BLOB_STORAGE_TOKEN not configured, cannot delete", { url });
        return false;
      }

      await del(url, { token });
      logger.info("File deleted from Vercel storage", { url });
      return true;
    }
  } catch (error) {
    logger.error("Failed to delete file from storage", error as Error, { url });
    return false;
  }
}

/**
 * Check if file exists in storage
 */
export async function fileExists(
  url: string,
  config?: StorageConfig
): Promise<boolean> {
  const token = config?.token || process.env.VERCEL_BLOB_STORAGE_TOKEN;

  if (!token) {
    return false;
  }

  try {
    await head(url, { token });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage configuration status
 */
export function getStorageStatus(): {
  configured: boolean;
  provider: StorageProvider;
  hasSupabase: boolean;
  hasVercel: boolean;
} {
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasVercel = !!process.env.VERCEL_BLOB_STORAGE_TOKEN;
  const provider = getStorageProvider();

  return {
    configured: hasSupabase || hasVercel,
    provider,
    hasSupabase,
    hasVercel,
  };
}

