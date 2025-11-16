/**
 * Video Render API Route
 * Renders video with captions using Remotion
 * 
 * Note: Due to Vercel serverless function timeout limits, this endpoint
 * may not work for long videos. For production, consider:
 * - Using a separate rendering service (Render.com, AWS Lambda with longer timeout)
 * - Using Remotion Lambda
 * - CLI rendering (documented in README)
 */

import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";
import type { RenderRequest, RenderResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Pro plan limit (10s for Hobby)

// In-memory job storage (in production, use Redis or database)
const renderJobs = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json();
    const { videoId, captions, style, quality = "1080p" } = body;

    // Validate input
    if (!videoId || !captions || captions.length === 0) {
      return NextResponse.json<RenderResponse>(
        {
          success: false,
          message: "Missing required fields: videoId, captions",
        },
        { status: 400 }
      );
    }

    // Create job ID
    const jobId = generateId();

    // Store job
    renderJobs.set(jobId, {
      id: jobId,
      videoId,
      captions,
      style,
      quality,
      status: "queued",
      progress: 0,
      createdAt: new Date(),
    });

    // Start rendering asynchronously (fire and forget for now)
    // In production, use a proper job queue
    renderVideo(jobId, body).catch((error) => {
      console.error("Render error:", error);
      const job = renderJobs.get(jobId);
      if (job) {
        job.status = "failed";
        job.error = error.message;
        renderJobs.set(jobId, job);
      }
    });

    return NextResponse.json<RenderResponse>({
      success: true,
      jobId,
      status: "queued",
      progress: 0,
      message: "Render job started",
    });
  } catch (error) {
    console.error("Render API error:", error);
    return NextResponse.json<RenderResponse>(
      {
        success: false,
        message: "Failed to start render job",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Get render job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json<RenderResponse>(
        {
          success: false,
          message: "Missing jobId parameter",
        },
        { status: 400 }
      );
    }

    const job = renderJobs.get(jobId);
    if (!job) {
      return NextResponse.json<RenderResponse>(
        {
          success: false,
          message: "Job not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<RenderResponse>({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      outputUrl: job.outputUrl,
      error: job.error,
      message: `Job status: ${job.status}`,
    });
  } catch (error) {
    console.error("Get job status error:", error);
    return NextResponse.json<RenderResponse>(
      {
        success: false,
        message: "Failed to get job status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Render video function (simplified - for production, use proper infrastructure)
// Note: Full Remotion rendering requires:
// - @remotion/bundler and @remotion/renderer packages
// - FFmpeg installed on the server
// - Proper file system access
// - Storage for output files
// - Longer timeout limits (Vercel Pro or separate service)
//
// For now, this is a placeholder that simulates the rendering process.
// For production, implement full Remotion rendering or use CLI rendering.
async function renderVideo(jobId: string, _request: RenderRequest) {
  const job = renderJobs.get(jobId);
  if (!job) return;

  try {
    job.status = "processing";
    job.progress = 10;
    renderJobs.set(jobId, job);

    // Simulate rendering progress
    // In production, replace this with actual Remotion rendering:
    // 1. Bundle Remotion project
    // 2. Select composition
    // 3. Render video with FFmpeg
    // 4. Upload to storage
    // 5. Update job status

    await new Promise((resolve) => setTimeout(resolve, 1000));
    job.progress = 50;
    renderJobs.set(jobId, job);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    job.progress = 100;
    job.status = "completed";
    // In production, set actual output URL from storage
    job.outputUrl = `/api/render/download?jobId=${jobId}`;
    job.completedAt = new Date();
    renderJobs.set(jobId, job);
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown error";
    renderJobs.set(jobId, job);
  }
}

