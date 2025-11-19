/**
 * Video Download API Route
 * Downloads the original video file from storage
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing video URL parameter",
        },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(videoUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid video URL",
        },
        { status: 400 }
      );
    }

    logger.info("Downloading video", { videoUrl });

    try {
      // Fetch the video from storage
      const response = await fetch(videoUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Remotion-Captioning-Platform/1.0",
        },
      });

      if (!response.ok) {
        logger.error("Failed to fetch video from storage", new Error(`HTTP ${response.status}`), {
          videoUrl,
          status: response.status,
          statusText: response.statusText,
        });
        return NextResponse.json(
          {
            success: false,
            message: `Failed to fetch video: ${response.status} ${response.statusText}`,
          },
          { status: response.status }
        );
      }

      // Get the video blob
      const blob = await response.blob();

      // Extract filename from URL or use default
      const urlPath = url.pathname;
      const fileName = urlPath.split("/").pop() || "video.mp4";

      // Return the video with proper headers for download
      return new NextResponse(blob, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": blob.size.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (fetchError) {
      logger.error("Error fetching video from storage", fetchError as Error, {
        videoUrl,
      });
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch video from storage",
          error: fetchError instanceof Error ? fetchError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Download API error", error as Error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

