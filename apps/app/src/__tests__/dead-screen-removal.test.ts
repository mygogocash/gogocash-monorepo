import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const removedDeadScreenPaths = [
  "src/screens/CustomerUtilityScreen.tsx",
  "src/screens/NativeParityScreen.tsx",
  "src/screens/home/DesktopHeader.tsx",
  "src/screens/home/DesktopCategoryNav.tsx",
  "src/screens/home/DesktopCategoryNavIcon.tsx",
] as const;

describe("dead mobile screen removal", () => {
  it.each(removedDeadScreenPaths)(
    "given removed screen %s > then it is not present in the tree",
    (relativePath) => {
      expect(fs.existsSync(path.join(mobileRoot, relativePath))).toBe(false);
    },
  );
});
