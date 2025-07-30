import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Add this block to disable ESLint during the build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
