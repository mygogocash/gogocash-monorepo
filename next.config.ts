import type { NextConfig } from "next";

// Note: "Preloaded using link preload but not used" console warnings for layout.css are a known
// Next.js + browser behavior (NEXT-1307). They are harmless and can be ignored; no config fix exists.

// When the app is served from a subpath (e.g. https://example.com/admin/), set NEXT_PUBLIC_BASE_PATH=/admin
// so chunk URLs become /admin/_next/... and resolve correctly.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "") || undefined;
const assetPrefix = (process.env.NEXT_PUBLIC_ASSET_PREFIX ?? basePath ?? "").replace(/\/$/, "") || undefined;

// Standalone for Node/Docker; static export for Firebase Hosting; default for Cloudflare etc.
const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  ...(assetPrefix ? { assetPrefix } : {}),
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
