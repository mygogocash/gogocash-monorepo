import type { NextConfig } from "next";

// Standalone for Node/Docker; static export for Firebase Hosting; default for Cloudflare etc.
const nextConfig: NextConfig = {
  ...(process.env.BUILD_FOR_FIREBASE === "1"
    ? { output: "export" as const, eslint: { ignoreDuringBuilds: true } }
    : process.env.STANDALONE === "1"
      ? { output: "standalone" as const }
      : {}),
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  images: {
    domains: ["img.involve.asia"],
  },
};

export default nextConfig;
