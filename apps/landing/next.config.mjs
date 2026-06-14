import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
/**
 * Monorepo workspace root (two levels up from apps/landing). Turbopack must use
 * this as its root so module resolution walks up into the hoisted root
 * `node_modules` (framer-motion, posthog-js, react-markdown, @firebase/*, etc.).
 * Pinning the root at the app dir hides every hoisted dependency.
 */
const workspaceRoot = path.resolve(projectRoot, "..", "..");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  /** Do not auto-open a browser during `npm run analyze` (CI / headless). */
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  /** Lets Playwright / tooling on 127.0.0.1 load Next dev HMR without cross-origin blocks. */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /** Tree-shake heavy client libs during compile (smaller + often faster). */
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.involve.asia",
        pathname: "/**",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
