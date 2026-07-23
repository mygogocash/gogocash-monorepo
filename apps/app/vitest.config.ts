import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      // react-native is Flow-typed; node tests alias to react-native-web (compiled JS).
      { find: "react-native", replacement: "react-native-web" },
      // @shopify/flash-list is externalized in the node env, so its internal
      // require("react-native") bypasses the alias above and hits the real
      // Flow-typed package ("Unexpected token 'typeof'"). Stub it like the
      // render config does — unit suites only import pure helpers around it.
      {
        find: "@shopify/flash-list",
        replacement: path.resolve(__dirname, "./src/test-support/flashListStub.tsx"),
      },
      { find: "@mobile", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
