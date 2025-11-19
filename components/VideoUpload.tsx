"use client";

/**
 * Video Upload Component
 * Handles video file upload with drag & drop support
 * Uses direct Supabase uploads for large files to bypass Vercel's 4.5MB limit
 */

import { useState, useRef, useCallback } from "react";
import { isValidMP4File, formatFileSize } from "@/lib/utils";
import { getVideoMetadata } from "@/lib/video";
import { createClient } from "@supabase/supabase-js";
import type { VideoUploadResponse, Video } from "@/types";

// Vercel's serverless function limit is 4.5MB
// Files larger than this should use direct upload
// Using 3.5MB to account for request overhead (headers, form data, etc.)
const VERCEL_LIMIT = 3.5 * 1024 * 1024; // 3.5MB (conservative to avoid Vercel's 4.5MB limit)

interface VideoUploadProps {
  onUploadSuccess: (video: Video, file: File) => void;
  onUploadError: (error: string) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file
      const validation = isValidMP4File(file);
      if (!validation.valid) {
        onUploadError(validation.error || "Invalid file");
        return;
      }

      setSelectedFile(file);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        let data: VideoUploadResponse;

        // For large files (>3.5MB), request a signed upload URL & upload directly to Supabase
        // This keeps large files off Vercel functions and bypasses Supabase RLS policies
        // Vercel has a hard 4.5MB limit, so we use 3.5MB to account for request overhead
        if (file.size > VERCEL_LIMIT) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";

          if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error(
              "Large file upload requires Supabase configuration. " +
                "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables. " +
                "Alternatively, use files smaller than 3.5MB."
            );
          }

          setUploadProgress(10);

          // Request signed upload URL/token from server (uses service role key)
          const signResponse = await fetch("/api/upload/sign", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type || "video/mp4",
            }),
          });

          if (!signResponse.ok) {
            const errorText = await signResponse.text();
            throw new Error(errorText || "Failed to create signed upload URL");
          }

          const signData = await signResponse.json();
          if (!signData.success || !signData.token || !signData.filePath) {
            throw new Error(signData.message || "Failed to create signed upload URL");
          }

          setUploadProgress(40);

          // Upload directly to Supabase using signed URL/token
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          const { error: uploadError } = await supabase.storage
            .from(signData.bucket || bucket)
            .uploadToSignedUrl(signData.filePath, signData.token, file, {
              contentType: file.type || "video/mp4",
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          setUploadProgress(90);

          data = {
            success: true,
            videoId: signData.videoId,
            videoUrl: signData.publicUrl,
            message: "Video uploaded successfully",
          };

          setUploadProgress(100);
        } else {
          // For smaller files, use the API route
          // Create FormData
          const formData = new FormData();
          formData.append("file", file);

          // Upload file
          let response: Response;
          try {
            response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
          } catch (networkError) {
            // Network errors might occur if Vercel rejects the request
            // Check if it's a payload too large error
            const errorMessage = networkError instanceof Error ? networkError.message : String(networkError);
            if (errorMessage.includes("FUNCTION_PAYLOAD_TOO_LARGE") || errorMessage.includes("Payload Too Large") || errorMessage.includes("413")) {
              throw new Error(
                "File is too large for server upload. " +
                "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured for direct uploads, " +
                "or use a file smaller than 3.5MB."
              );
            }
            throw networkError;
          }

          // Check if response is ok before parsing
          if (!response.ok) {
            // Handle Vercel's payload too large error specifically
            const responseText = response.statusText || "";
            const statusText = responseText.toLowerCase();
            if (response.status === 413 || 
                statusText.includes("payload too large") || 
                statusText.includes("function_payload_too_large") ||
                statusText.includes("request entity too large")) {
              throw new Error(
                "File is too large for server upload. " +
                "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured for direct uploads, " +
                "or use a file smaller than 3.5MB."
              );
            }

            // Try to parse error response, but handle empty/invalid JSON
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;
            try {
              const errorText = await response.text();
              if (errorText && errorText.trim()) {
                // Check if it's Vercel's FUNCTION_PAYLOAD_TOO_LARGE error
                if (errorText.includes("FUNCTION_PAYLOAD_TOO_LARGE") || 
                    errorText.includes("Request Entity Too Large") ||
                    errorText.includes("Payload Too Large")) {
                  throw new Error(
                    "File is too large for server upload. " +
                    "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured for direct uploads, " +
                    "or use a file smaller than 3.5MB."
                  );
                }
                
                // Try to parse as JSON
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                  try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                  } catch {
                    // Not valid JSON, use text as-is
                    errorMessage = errorText.substring(0, 200);
                  }
                } else {
                  errorMessage = errorText.substring(0, 200);
                }
              }
            } catch (parseError) {
              // If parsing fails, use status text
              console.error("Failed to parse error response:", parseError);
            }
            throw new Error(errorMessage);
          }

          // Parse successful response
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid response format from server");
          }

          const responseText = await response.text();
          if (!responseText || !responseText.trim()) {
            throw new Error("Empty response from server");
          }

          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            console.error("Response text:", responseText.substring(0, 200));
            throw new Error("Invalid JSON response from server. Check server logs for details.");
          }

          if (!data.success || !data.videoId || !data.videoUrl) {
            throw new Error(data.message || "Upload failed");
          }
        }

        // Validate response data
        if (!data.videoId || !data.videoUrl) {
          throw new Error(data.message || "Upload failed: Missing video ID or URL");
        }

        // Get video metadata from client-side
        const metadata = await getVideoMetadata(file);

        // Create video object
        const video: Video = {
          id: data.videoId,
          originalUrl: data.videoUrl,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          fileSize: metadata.fileSize,
          uploadedAt: new Date(),
          status: "ready",
        };

        onUploadSuccess(video, file);
        setSelectedFile(null);
      } catch (error) {
        // Error is already logged on server side
        onUploadError(
          error instanceof Error ? error.message : "Failed to upload video"
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [onUploadSuccess, onUploadError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
            </p>
            {selectedFile && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Drop your MP4 video here, or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Maximum file size: 100MB (files over 3.5MB use direct upload)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

