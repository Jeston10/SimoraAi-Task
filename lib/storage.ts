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
 * Upload file to Supabase Storage (FREE, open-source)
 */
async function uploadToSupabase(
  fileName: string,
  file: File | Buffer,
  _config?: StorageConfig
): Promise<{ url: string; size: number }> {
  const supabase = getSupabaseClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

  try {
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
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBlob, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

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

