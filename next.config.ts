import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  env: {
    PORT: process.env.PORT || '8080'
  }
};

export default nextConfig;