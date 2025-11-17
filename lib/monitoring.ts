/**
 * Error Monitoring & Analytics
 * Optional integration with Sentry and analytics services
 * 
 * Note: Sentry is initialized in sentry.client.config.ts and sentry.server.config.ts
 * This file provides helper functions to use Sentry throughout the application
 */

import { logger } from "./logger";
import * as Sentry from "@sentry/nextjs";

/**
 * Initialize Sentry error tracking
 * Note: Sentry is auto-initialized via config files, but this can be used for additional setup
 */
export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info("Sentry DSN not configured, error tracking disabled");
    return;
  }

  logger.info("Sentry initialized", { dsn: dsn.substring(0, 20) + "..." });
}

/**
 * Capture exception for error tracking
 * Use this in try-catch blocks or areas where exceptions are expected
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  logger.error("Exception captured", error, context);

  try {
    Sentry.captureException(error, { extra: context });
  } catch (err) {
    logger.error("Failed to send exception to Sentry", err as Error);
  }
}

/**
 * Capture message for error tracking
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (level === "warning") {
    logger.warn(message);
  } else if (level === "error") {
    logger.error(message);
  } else {
    logger.info(message);
  }

  try {
    Sentry.captureMessage(message, level);
  } catch (err) {
    logger.error("Failed to send message to Sentry", err as Error);
  }
}

/**
 * Analytics tracking (optional)
 * Can be extended to integrate with Google Analytics, Mixpanel, etc.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  logger.debug("Event tracked", { eventName, properties });

  // Example: Google Analytics 4
  // if (typeof window !== "undefined" && window.gtag) {
  //   window.gtag("event", eventName, properties);
  // }

  // Example: Mixpanel
  // if (typeof window !== "undefined" && window.mixpanel) {
  //   window.mixpanel.track(eventName, properties);
  // }
}

/**
 * Track page view
 */
export function trackPageView(path: string) {
  logger.debug("Page view tracked", { path });
  trackEvent("page_view", { path });
}

