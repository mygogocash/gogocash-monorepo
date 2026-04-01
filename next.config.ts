import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Note: 'standalone' mode has issues with next-intl middleware in Next.js 16
  // Use Docker multi-stage build or wait for Next.js fix
  // Uncomment when deploying to production with Docker
  // output: 'standalone',

  experimental: {
    // เปิดใช้งานการคืนค่าตำแหน่งการเลื่อนเมื่อย้อนกลับ
    scrollRestoration: true,
    /** Tree-shake barrel imports for large UI packages (smaller dev + prod chunks). */
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/x-data-grid",
      "lucide-react",
    ],
  },

  // Compress response
  compress: true,

  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // swcMinify: false,
  // output: 'standalone', // Duplicate - removed
  // Development optimizations for hot reload

  // Support for external modules transpilation
  // transpilePackages: ['lucid-cardano', '@crossmint/connect'],

  // Modern image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.gogocash.co",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "my-live.slatic.net",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "th-live-01.slatic.net",
      },
      {
        protocol: "https",
        hostname: "img.involve.asia",
      },
      /** API-driven images (banners, logos) may use any HTTPS origin; avoids next/image invalid hostname warnings. */
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    /** Allow `quality={92}` on local avatar images (ProfileBar, etc.); Next 16 requires explicit values. */
    qualities: [75, 92],
  },

  /**
   * Webpack: production `splitChunks` below shapes vendor/async boundaries.
   * For deeper tuning, run `npm run analyze` (ANALYZE=true) and adjust `cacheGroups` only with bundle evidence.
   */
  webpack: (config, { dev }) => {
    // Development optimizations
    if (dev) {
      // Enable faster rebuilds
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules", "**/.next", "**/.git"],
      };

      // Optimize development builds
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };

      // Enable source maps for better debugging
      config.devtool = "eval-cheap-module-source-map";
    }
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Handle async/await and top-level await for external modules
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
    };

    // Optimize module resolution
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      },
    };

    // Handle specific problematic modules
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Minimize output in production
    if (!dev) {
      config.optimization.minimize = true;
    }

    return config;
  },

  async redirects() {
    return [
      /** Legacy static file; App Router page lives at `/[locale]/membership`. */
      {
        source: "/membership.html",
        destination: "/membership",
        permanent: true,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.facebook.com https://*.posthog.com https://*.i.posthog.com https://www.gstatic.com https://*.firebaseio.com https://*.googleapis.com https://telegram.org",
              "connect-src 'self' https: wss:",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' https: data:",
              "frame-src 'self' https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const intlBundled = withNextIntl(withBundleAnalyzer(nextConfig));

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default withSentryConfig(intlBundled, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  telemetry: false,
  ...(sentryAuthToken
    ? {}
    : {
        /** Avoid post-compile release step that logs when `authToken` is missing. */
        useRunAfterProductionCompileHook: false,
        release: { create: false, finalize: false },
        sourcemaps: { disable: true },
      }),
});
