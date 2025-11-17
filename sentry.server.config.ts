/**
 * Sentry Server Configuration
 * This file configures Sentry for the Next.js server-side
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || "development",
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Logging Integration
    integrations: [
      // Send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleIntegration({
        levels: ["log", "warn", "error"],
      }),
    ],
  });
}

