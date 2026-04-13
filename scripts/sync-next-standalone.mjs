/**
 * After `next build` with `output: "standalone"`, copy traced server deps plus
 * `.next/static` and `public` into `.next/standalone` so `node .next/standalone/server.js`
 * serves JS/CSS/fonts and public files (Firebase / Docker do the same in their images).
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const serverJs = join(standaloneDir, "server.js");

if (!existsSync(serverJs)) {
  console.error("sync-next-standalone: missing .next/standalone/server.js — run `npm run build` first.");
  process.exit(1);
}

const staticSrc = join(root, ".next", "static");
const staticDest = join(standaloneDir, ".next", "static");
const publicSrc = join(root, "public");
const publicDest = join(standaloneDir, "public");

if (!existsSync(staticSrc)) {
  console.error("sync-next-standalone: missing .next/static — build may have failed.");
  process.exit(1);
}

mkdirSync(join(standaloneDir, ".next"), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
cpSync(publicSrc, publicDest, { recursive: true });
console.log("sync-next-standalone: copied .next/static and public → .next/standalone");
