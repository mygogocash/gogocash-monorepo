import type { NextConfig } from "next";
import { imageRemotePatterns } from "./src/config/imageHosts";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Note: "Preloaded using link preload but not used" console warnings for layout.css are a known
// Next.js + browser behavior (NEXT-1307). They are harmless and can be ignored; no config fix exists.

// When the app is served from a subpath (e.g. https://example.com/admin/), set NEXT_PUBLIC_BASE_PATH=/admin
// so chunk URLs become /admin/_next/... and resolve correctly.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "") || undefined;
const assetPrefix = (process.env.NEXT_PUBLIC_ASSET_PREFIX ?? basePath ?? "").replace(/\/$/, "") || undefined;

// Standalone for Node/Docker; static export for Firebase Hosting.
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/x-data-grid"],
  },
  ...(basePath ? { basePath } : {}),
  ...(assetPrefix ? { assetPrefix } : {}),
  ...(process.env.BUILD_FOR_FIREBASE === "1"
    ? {
        output: "export" as const,
        // Without trailingSlash, export emits route.html plus route/ for nested SSG; Firebase
        // resolves /route to the directory and 404s when route/index.html is missing.
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_FIREBASE_STATIC: "1",
        },
      }
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
