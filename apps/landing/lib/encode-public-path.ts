/** Encode each path segment so spaces/special chars work with `next/image` and static hosting. */
export function encodePublicPath(path: string): string {
  if (!path.startsWith("/")) return path;
  const parts = path.split("/").filter(Boolean);
  return "/" + parts.map((segment) => encodeURIComponent(segment)).join("/");
}
