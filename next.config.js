/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  // Remotion configuration
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@remotion': '@remotion',
    };
    return config;
  },
  // Experimental features for better performance
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Enable instrumentation hook for Sentry
    instrumentationHook: true,
  },
};

// Wrap with Sentry configuration
module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry options
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // Sentry webpack plugin options
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);

