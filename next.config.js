/** @type {import('next').NextConfig} */
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
  },
};

module.exports = nextConfig;

