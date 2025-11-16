"use client";

/**
 * Video Export Component
 * Handles video rendering and export with captions
 */

import { useState, useEffect } from "react";
import { ProgressBar } from "./ProgressBar";
import type { Video, Caption, CaptionStyleId, RenderQuality, RenderJobStatus } from "@/types";
import { formatDuration } from "@/lib/utils";

interface VideoExportProps {
  video: Video | null;
  captions: Caption[];
  style: CaptionStyleId;
}

export const VideoExport: React.FC<VideoExportProps> = ({
  video,
  captions,
  style,
}) => {
  const [quality, setQuality] = useState<RenderQuality>("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<RenderJobStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for job status
  useEffect(() => {
    if (!jobId || !isExporting) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render?jobId=${jobId}`);
        const data = await response.json();

        if (data.success) {
          setExportProgress(data.progress || 0);
          setExportStatus(data.status);

          if (data.status === "completed" && data.outputUrl) {
            setIsExporting(false);
            setDownloadUrl(data.outputUrl);
            setExportStatus("completed");
          } else if (data.status === "failed") {
            setIsExporting(false);
            setError(data.error || "Export failed");
            setExportStatus("failed");
          }
        }
      } catch (err) {
        console.error("Error checking job status:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, isExporting]);

  const handleExport = async () => {
    if (!video || captions.length === 0) {
      setError("Video and captions are required");
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportProgress(0);
    setDownloadUrl(null);
    setExportStatus("queued");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId: video.id,
          captions,
          style,
          quality,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.message || "Failed to start export");
      }

      setJobId(data.jobId);
      setExportStatus(data.status || "queued");
    } catch (err) {
      console.error("Export error:", err);
      setError(err instanceof Error ? err.message : "Failed to start export");
      setIsExporting(false);
      setExportStatus("failed");
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  if (!video || captions.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Generate captions first to export video
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Export Video
      </h2>

      {/* Quality Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Export Quality
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setQuality("720p")}
            disabled={isExporting}
            className={`
              p-3 rounded-lg border-2 transition-all duration-200
              ${
                quality === "720p"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className="font-semibold text-gray-900 dark:text-white">720p</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Faster, smaller file
            </div>
          </button>
          <button
            onClick={() => setQuality("1080p")}
            disabled={isExporting}
            className={`
              p-3 rounded-lg border-2 transition-all duration-200
              ${
                quality === "1080p"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className="font-semibold text-gray-900 dark:text-white">1080p</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Higher quality
            </div>
          </button>
        </div>
      </div>

      {/* Export Info */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Duration</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDuration(video.duration)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Captions</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {captions.length}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Style</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {style}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Quality</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {quality}
            </p>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none mb-4"
      >
        {isExporting ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Video
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isExporting && (
        <div className="mb-4">
          <ProgressBar
            progress={exportProgress}
            label={
              exportStatus === "queued"
                ? "Queued..."
                : exportStatus === "processing"
                ? "Rendering video..."
                : "Processing..."
            }
          />
        </div>
      )}

      {/* Download Button */}
      {downloadUrl && exportStatus === "completed" && (
        <button
          onClick={handleDownload}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download Video
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Info Message */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Video rendering may take several minutes depending on video length. 
          For longer videos or production use, consider using CLI rendering (see README).
        </p>
      </div>
    </div>
  );
};

