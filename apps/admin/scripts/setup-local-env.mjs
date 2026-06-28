#!/usr/bin/env node
/**
 * Creates .env.local from .env.example for local development (mock API).
 * Safe to re-run: skips if .env.local already exists.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const target = join(root, ".env.local");
const example = join(root, ".env.example");

if (existsSync(target)) {
  console.log("setup-local-env: .env.local already exists — leaving it unchanged.");
  process.exit(0);
}

if (!existsSync(example)) {
  console.error("setup-local-env: .env.example not found.");
  process.exit(1);
}

let content = readFileSync(example, "utf8");
const secret = randomBytes(32).toString("base64url");
content = content.replace(
  /^NEXTAUTH_SECRET=.*$/m,
  `NEXTAUTH_SECRET=${secret}`,
);

writeFileSync(target, content, "utf8");
console.log("setup-local-env: wrote .env.local (NEXTAUTH_SECRET generated).");
console.log("setup-local-env: start with: npm run dev  → http://localhost:3000");
console.log("setup-local-env: or:        npm run dev:3001  (set NEXTAUTH_URL to http://localhost:3001 in .env.local)");
