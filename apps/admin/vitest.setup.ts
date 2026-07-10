// The /vitest entrypoint both calls expect.extend AND augments vitest's
// Assertion interface, so jest-dom matchers type-check under tsc --noEmit
// (the previous manual `expect.extend(matchers)` only registered them at
// runtime, leaving 85 TS2339s across the test suites).
import "@testing-library/jest-dom/vitest";
