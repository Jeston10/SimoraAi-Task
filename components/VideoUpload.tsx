"use client";

/**
 * Video Upload Component
 * Handles video file upload with drag & drop support
 * Uses direct Supabase uploads for large files to bypass Vercel's 4.5MB limit
 */

import { useState, useRef, useCallback } from "react";
import { isValidMP4File, formatFileSize, generateId } from "@/lib/utils";
import { getVideoMetadata } from "@/lib/video";
import { createClient } from "@supabase/supabase-js";
import type { VideoUploadResponse, Video } from "@/types";

// Vercel's serverless function limit is 4.5MB
// Files larger than this should use direct upload
const VERCEL_LIMIT = 4 * 1024 * 1024; // 4MB (slightly below 4.5MB for safety)

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

        // For large files (>4MB), use direct Supabase upload to bypass Vercel's limit
        if (file.size > VERCEL_LIMIT) {
          // Check if Supabase is configured (we'll use environment variables)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error(
              "Large file upload requires Supabase configuration. " +
              "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables. " +
              "Alternatively, use files smaller than 4MB."
            );
          }

          // Generate unique file name
          const videoId = generateId();
          const fileName = `${videoId}-${file.name}`;
          const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";

          // Create Supabase client
          const supabase = createClient(supabaseUrl, supabaseAnonKey);

          // Upload directly to Supabase
          setUploadProgress(10);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: true,
              contentType: file.type || "video/mp4",
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          setUploadProgress(90);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

          setUploadProgress(100);

          data = {
            success: true,
            videoId,
            videoUrl: urlData.publicUrl,
            message: "Video uploaded successfully",
          };
        } else {
          // For smaller files, use the API route
          // Create FormData
          const formData = new FormData();
          formData.append("file", file);

          // Upload file
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          // Check if response is ok before parsing
          if (!response.ok) {
            // Handle Vercel's payload too large error specifically
            if (response.status === 413 || response.statusText.includes("Payload Too Large")) {
              throw new Error(
                "File is too large for server upload. " +
                "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured for direct uploads, " +
                "or use a file smaller than 4MB."
              );
            }

            // Try to parse error response, but handle empty/invalid JSON
            let errorMessage = `Server error: ${response.status} ${response.statusText}`;
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const errorText = await response.text();
                if (errorText && errorText.trim()) {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.message || errorData.error || errorMessage;
                }
              } else {
                const errorText = await response.text();
                if (errorText && errorText.trim()) {
                  errorMessage = errorText.substring(0, 200);
                }
              }
            } catch (parseError) {
              // If JSON parsing fails, use status text
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
                Maximum file size: 100MB (files over 4MB use direct upload)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

