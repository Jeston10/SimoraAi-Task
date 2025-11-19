/**
 * Render Jobs Store
 * In-memory job storage for render jobs
 * 
 * Note: In production, replace this with Redis, a database, or another persistent store
 * since serverless functions are stateless and in-memory storage won't persist
 */

export interface RenderJob {
  id: string;
  videoId: string;
  videoUrl?: string; // Original video URL for fallback download
  captions: any[];
  style?: any;
  quality: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory job storage
// In production, use Redis, database, or another persistent store
const renderJobs = new Map<string, RenderJob>();

export const renderJobStore = {
  /**
   * Get a job by ID
   */
  get(jobId: string): RenderJob | undefined {
    return renderJobs.get(jobId);
  },

  /**
   * Set/update a job
   */
  set(jobId: string, job: RenderJob): void {
    renderJobs.set(jobId, job);
  },

  /**
   * Delete a job
   */
  delete(jobId: string): boolean {
    return renderJobs.delete(jobId);
  },

  /**
   * Check if a job exists
   */
  has(jobId: string): boolean {
    return renderJobs.has(jobId);
  },

  /**
   * Get all jobs (for debugging)
   */
  getAll(): RenderJob[] {
    return Array.from(renderJobs.values());
  },
};

