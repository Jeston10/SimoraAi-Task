/**
 * Logging Utility
 * Replaces console.log/error with proper logging system
 * Supports different log levels and can be extended for production logging services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    // Set log level from environment or default to 'info'
    this.logLevel =
      (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? "debug" : "info");
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : "";
    const errorStr = entry.error
      ? `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`
      : "";
    return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    const formattedMessage = this.formatMessage(entry);

    // In development, use console with colors
    if (this.isDevelopment) {
      switch (level) {
        case "debug":
          console.debug(formattedMessage);
          break;
        case "info":
          console.info(formattedMessage);
          break;
        case "warn":
          console.warn(formattedMessage);
          break;
        case "error":
          console.error(formattedMessage);
          break;
      }
    } else {
      // In production, use appropriate console method
      // Can be extended to send to logging service (Sentry, LogRocket, etc.)
      if (level === "error") {
        console.error(formattedMessage);
        // TODO: Send to error tracking service (Sentry)
        // if (process.env.SENTRY_DSN) {
        //   Sentry.captureException(error || new Error(message), { extra: context });
        // }
      } else {
        console.log(formattedMessage);
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log("error", message, context, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for custom instances if needed
export { Logger };

