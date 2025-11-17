"use client";

/**
 * Main Application Page
 */

import { useState, useMemo, useEffect } from "react";
import { VideoUpload } from "@/components/VideoUpload";
import { CaptionGenerator } from "@/components/CaptionGenerator";
import { CaptionPreview } from "@/components/CaptionPreview";
import { VideoExport } from "@/components/VideoExport";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/useToast";
import { createVideoBlobUrl, revokeVideoBlobUrl } from "@/lib/video";
import type { Video, Caption, CaptionStyleId } from "@/types";

export default function Home() {
  const [video, setVideo] = useState<Video | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleId>("bottom");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Create blob URL for video preview
  const videoBlobUrl = useMemo(() => {
    if (!videoFile) return "";
    return createVideoBlobUrl(videoFile);
  }, [videoFile]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (videoBlobUrl) {
        revokeVideoBlobUrl(videoBlobUrl);
      }
    };
  }, [videoBlobUrl]);

  const handleUploadSuccess = (uploadedVideo: Video, file: File) => {
    setVideo(uploadedVideo);
    setVideoFile(file);
    setError(null);
    setCaptions(null); // Reset captions when new video is uploaded
    toast.success(`Video uploaded successfully! (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  const handleCaptionsGenerated = (generatedCaptions: Caption[]) => {
    setCaptions(generatedCaptions);
    toast.success(`Successfully generated ${generatedCaptions.length} captions!`);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setVideo(null);
    setVideoFile(null);
    setCaptions(null);
    toast.error(errorMessage);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <ToastContainer
        toasts={toast.toasts}
        onRemove={toast.removeToast}
      />
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Remotion Captioning Platform
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload your MP4 video and automatically generate captions with support for Hinglish (Hindi + English)
          </p>
        </div>

        {/* Error Message - Only show if not handled by toast */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">Error</p>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Step 1: Upload Video
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              MP4 only, max 100MB
            </span>
          </div>
          <VideoUpload
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>

        {/* Video Info */}
        {video && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Video Information
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {Math.floor(video.duration / 60)}:
                  {Math.floor(video.duration % 60)
                    .toString()
                    .padStart(2, "0")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Resolution</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {video.width} × {video.height}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">File Size</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {(video.fileSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-lg font-medium text-green-600 dark:text-green-400">
                  {video.status}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Video ID</p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {video.id}
              </p>
            </div>
          </div>
        )}

        {/* Caption Generator */}
        {video && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 2: Generate Captions
            </h2>
            <CaptionGenerator
              video={video}
              videoFile={videoFile}
              onCaptionsGenerated={handleCaptionsGenerated}
            />
          </div>
        )}

        {/* Next Steps Info */}
        {video && !captions && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">Next Step</p>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Video uploaded successfully! Generate captions above to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Caption Preview */}
        {video && captions && captions.length > 0 && videoBlobUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 3: Preview & Customize
            </h2>
            <CaptionPreview
              video={video}
              videoUrl={videoBlobUrl}
              captions={captions}
              style={captionStyle}
              onStyleChange={setCaptionStyle}
            />
          </div>
        )}

        {/* Video Export */}
        {video && captions && captions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 animate-in fade-in slide-in-from-bottom-4">
            <VideoExport
              video={video}
              captions={captions}
              style={captionStyle}
            />
          </div>
        )}

        {/* Success Messages */}
        {captions && captions.length > 0 && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-xl">✨</span>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">Ready to Export!</p>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  {captions.length} captions generated! Preview above, switch styles, and export your final video with captions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
