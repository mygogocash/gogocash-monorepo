import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
    root: projectRoot,
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
