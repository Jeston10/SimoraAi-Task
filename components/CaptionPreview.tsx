"use client";

/**
 * Caption Preview Component
 * Uses Remotion Player to preview video with captions
 */

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { CaptionVideo } from "@/app/remotion/CaptionVideo";
import type { Video, Caption, CaptionStyleId } from "@/types";

interface CaptionPreviewProps {
  video: Video | null;
  videoUrl: string; // Blob URL or video URL
  captions: Caption[];
  style: CaptionStyleId;
  onStyleChange?: (style: CaptionStyleId) => void;
}

export const CaptionPreview: React.FC<CaptionPreviewProps> = ({
  video,
  videoUrl,
  captions,
  style,
  onStyleChange,
}) => {

  // Calculate duration in frames (30fps)
  const durationInFrames = useMemo(() => {
    if (!video) return 300; // Default 10 seconds
    return Math.ceil(video.duration * 30); // 30 fps
  }, [video]);

  // Style options
  const styleOptions: { id: CaptionStyleId; name: string; description: string }[] = [
    { id: "bottom", name: "Bottom-Centered", description: "Standard subtitle style" },
    { id: "top", name: "Top-Bar", description: "News-style captions" },
    { id: "karaoke", name: "Karaoke", description: "Word-by-word highlighting" },
  ];

  if (!video || captions.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Upload a video and generate captions to see preview
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Preview with Captions
      </h2>

      {/* Style Selector */}
      {onStyleChange && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Caption Style
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {styleOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onStyleChange(option.id)}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 text-left
                  ${
                    style === option.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }
                `}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {option.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Remotion Player */}
      <div className="bg-black rounded-lg overflow-hidden mb-4">
        <Player
          component={CaptionVideo}
          durationInFrames={durationInFrames}
          compositionWidth={video.width || 1920}
          compositionHeight={video.height || 1080}
          fps={30}
          controls
          style={{
            width: "100%",
            maxWidth: "100%",
          }}
          inputProps={{
            videoUrl,
            captions,
            style,
          }}
        />
      </div>

      {/* Video Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Duration</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {Math.floor(video.duration / 60)}:
            {Math.floor(video.duration % 60)
              .toString()
              .padStart(2, "0")}
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
          <p className="text-gray-500 dark:text-gray-400">Resolution</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {video.width} × {video.height}
          </p>
        </div>
      </div>
    </div>
  );
};

