/**
 * Sentry Client Instrumentation
 * This file configures Sentry for the browser/client-side
 * Replaces sentry.client.config.ts (recommended for Next.js App Router)
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || "development",
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Filter out common non-errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      "atomicFindClose",
      // Network errors
      "NetworkError",
      "Failed to fetch",
      "Network request failed",
    ],
    
    // Filter out URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],
  });
}

// Export router transition hook for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

