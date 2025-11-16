"use client";

/**
 * Caption Generator Component
 * Handles caption generation from uploaded video
 */

import { useState } from "react";
import type { Caption, Video, CaptionGenerationResponse } from "@/types";
import { formatDuration } from "@/lib/utils";

interface CaptionGeneratorProps {
  video: Video | null;
  videoFile: File | null;
  onCaptionsGenerated: (captions: Caption[]) => void;
}

export const CaptionGenerator: React.FC<CaptionGeneratorProps> = ({
  video,
  videoFile,
  onCaptionsGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"hi" | "en" | "auto">("auto");
  const [progress, setProgress] = useState<string>("");

  const handleGenerate = async () => {
    if (!video || !videoFile) {
      setError("No video file available");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress("Preparing video...");

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("language", language);

      setProgress("Sending to transcription service...");

      const response = await fetch("/api/captions/generate", {
        method: "POST",
        body: formData,
      });

      setProgress("Processing audio...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate captions");
      }

      const data: CaptionGenerationResponse = await response.json();

      if (!data.success || !data.captions) {
        throw new Error(data.message || "Failed to generate captions");
      }

      setCaptions(data.captions);
      onCaptionsGenerated(data.captions);
      setProgress("Complete!");
    } catch (err) {
      console.error("Caption generation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate captions"
      );
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  if (!video || !videoFile) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Upload a video first to generate captions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Generate Captions
      </h2>

      {/* Language Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Language
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            (Select the primary language or auto-detect)
          </span>
        </label>
        <select
          value={language}
          onChange={(e) =>
            setLanguage(e.target.value as "hi" | "en" | "auto")
          }
          disabled={isGenerating}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
        >
          <option value="auto">Auto-detect (Recommended)</option>
          <option value="en">English</option>
          <option value="hi">Hindi / Hinglish</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none"
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
            {progress || "Generating captions..."}
          </>
        ) : (
          "Auto-generate Captions"
        )}
      </button>

      {/* Progress Message */}
      {progress && !isGenerating && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          {progress}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Captions Display */}
      {captions && captions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Generated Captions ({captions.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {captions.map((caption) => (
              <div
                key={caption.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {formatDuration(caption.start)} → {formatDuration(caption.end)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    #{caption.id}
                  </span>
                </div>
                <p className="text-gray-900 dark:text-white">
                  {caption.text}
                </p>
                {caption.words && caption.words.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {caption.words.length} words
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

