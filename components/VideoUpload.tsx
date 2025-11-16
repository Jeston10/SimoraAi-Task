"use client";

/**
 * Video Upload Component
 * Handles video file upload with drag & drop support
 */

import { useState, useRef, useCallback } from "react";
import { isValidMP4File, formatFileSize } from "@/lib/utils";
import { getVideoMetadata } from "@/lib/video";
import type { VideoUploadResponse, Video } from "@/types";

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
        // Create FormData
        const formData = new FormData();
        formData.append("file", file);

        // Upload file
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data: VideoUploadResponse = await response.json();

        if (!data.success || !data.videoId || !data.videoUrl) {
          throw new Error(data.message || "Upload failed");
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
        console.error("Upload error:", error);
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
                Maximum file size: 100MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

