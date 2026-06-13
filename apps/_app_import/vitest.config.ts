import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default env stays `node` so server-side modules (NextAuth secret
    // reads, env loaders) keep passing as-is. Component tests opt in to
    // happy-dom via the `// @vitest-environment happy-dom` doc-comment
    // at the top of `*.test.tsx` files. See `src/__tests__/rtl-smoke.test.tsx`.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
