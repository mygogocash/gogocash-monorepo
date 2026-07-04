import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // react-native is Flow-typed; node tests alias to react-native-web (compiled JS).
      { find: "react-native", replacement: "react-native-web" },
      { find: "@mobile", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
