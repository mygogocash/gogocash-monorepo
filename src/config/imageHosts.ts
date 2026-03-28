/**
 * Hostnames allowed for Next.js image optimization (must match `images.remotePatterns`).
 * Extend with comma-separated `NEXT_PUBLIC_IMAGE_OPT_HOSTS` (e.g. `cdn.example.com,api.example.com`).
 */
const BASE_HOSTS = ["img.involve.asia", "placehold.co"] as const;

function hostnamesFromEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_IMAGE_OPT_HOSTS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function allOptimizedImageHostnames(): string[] {
  return [...new Set([...BASE_HOSTS.map((h) => h.toLowerCase()), ...hostnamesFromEnv()])];
}

export function imageRemotePatterns(): Array<{
  protocol: "https";
  hostname: string;
  pathname: string;
}> {
  return allOptimizedImageHostnames().map((hostname) => ({
    protocol: "https" as const,
    hostname,
    pathname: "/**",
  }));
}

let cachedAllowedHosts: Set<string> | null = null;

export function allowedOptimizedImageHostSet(): Set<string> {
  if (!cachedAllowedHosts) {
    cachedAllowedHosts = new Set(allOptimizedImageHostnames());
  }
  return cachedAllowedHosts;
}
