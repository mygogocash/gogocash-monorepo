import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  DM_Sans: vi.fn(() => ({
    variable: "--font-dm-sans",
    className: "mock-dm-sans",
    style: { fontFamily: "sans-serif" },
  })),
  Anuphan: vi.fn(() => ({
    variable: "--font-anuphan",
    className: "mock-anuphan",
    style: { fontFamily: "sans-serif" },
  })),
}));
