import type { NextConfig } from "next";
import { imageRemotePatterns } from "./src/config/imageHosts";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Standalone for Node/Docker; static export for Firebase Hosting; default for Cloudflare etc.
const nextConfig: NextConfig = {
  ...(process.env.BUILD_FOR_FIREBASE === "1"
    ? { output: "export" as const }
    : process.env.STANDALONE === "1"
      ? { output: "standalone" as const }
      : {}),
  // Next.js 16 defaults to Turbopack for `next build`; mirror SVGR here (webpack() alone errors).
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  images: {
    remotePatterns: imageRemotePatterns(),
  },
};

export default withBundleAnalyzer(nextConfig);
