/**
 * Video Download API Route
 * Handles downloading rendered videos
 * 
 * Note: Since full Remotion rendering isn't implemented yet,
 * this endpoint currently provides a helpful error message.
 * In production, implement full Remotion rendering to generate actual video files.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { renderJobStore } from "@/lib/render-jobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing jobId parameter",
        },
        { status: 400 }
      );
    }

    // Get job from shared store
    const job = renderJobStore.get(jobId);
    
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found",
        },
        { status: 404 }
      );
    }

    // Check if job is completed
    if (job.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          message: `Job is not completed yet. Current status: ${job.status}`,
          status: job.status,
          progress: job.progress,
        },
        { status: 400 }
      );
    }

    // If outputUrl is a full URL (storage URL), fetch and serve it directly
    const videoUrl = job.outputUrl && job.outputUrl.startsWith("http") 
      ? job.outputUrl 
      : (job.videoUrl && job.videoUrl.startsWith("http") ? job.videoUrl : null);

    if (videoUrl) {
      logger.info("Fetching video for download", {
        jobId,
        videoUrl,
      });

      try {
        // Fetch the video from storage
        const videoResponse = await fetch(videoUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Remotion-Captioning-Platform/1.0",
          },
        });

        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
        }

        // Get the video blob
        const blob = await videoResponse.blob();

        // Extract filename from URL or use default
        const urlObj = new URL(videoUrl);
        const urlPath = urlObj.pathname;
        const fileName = urlPath.split("/").pop() || `video-${jobId}.mp4`;

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
        logger.error("Error fetching video for download", fetchError as Error, {
          jobId,
          videoUrl,
        });
        return NextResponse.json(
          {
            success: false,
            message: "Failed to fetch video for download",
            error: fetchError instanceof Error ? fetchError.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // If outputUrl is a relative path (placeholder), the video wasn't actually rendered
    // This happens because full Remotion rendering isn't implemented yet
    logger.warn("Download requested but no video URL available", {
      jobId,
      outputUrl: job.outputUrl,
      videoUrl: job.videoUrl,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Video rendering is not fully implemented yet. The render job completed, but no actual video file was generated.",
        note: "This is a placeholder implementation. To enable actual video rendering with captions, implement full Remotion rendering using @remotion/bundler and @remotion/renderer, or use Remotion Lambda for serverless rendering.",
        jobId,
        status: job.status,
      },
      { status: 501 } // 501 Not Implemented
    );
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

