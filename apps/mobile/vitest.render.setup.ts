import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees between render tests so happy-dom state never leaks.
afterEach(() => {
  cleanup();
});
