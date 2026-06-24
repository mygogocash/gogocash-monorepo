import fs from "node:fs";
import path from "node:path";

const DISCOVERY_DIR = "src/screens/discovery";
const DISCOVERY_ROUTER = "src/screens/CustomerDiscoveryScreen.tsx";

function listDiscoveryModuleFiles(mobileRoot: string, extensions: readonly string[]) {
  const discoveryPath = path.join(mobileRoot, DISCOVERY_DIR);
  return fs
    .readdirSync(discoveryPath)
    .filter((file) => extensions.some((extension) => file.endsWith(extension)))
    .sort()
    .map((file) => path.join(DISCOVERY_DIR, file));
}

export function readDiscoveryRouter(mobileRoot: string) {
  return fs.readFileSync(path.join(mobileRoot, DISCOVERY_ROUTER), "utf8");
}

/** Router + all discovery modules (screens, shared UI, styles). */
export function readDiscoverySources(mobileRoot: string) {
  const moduleFiles = listDiscoveryModuleFiles(mobileRoot, [".ts", ".tsx"]);
  return [readDiscoveryRouter(mobileRoot), ...moduleFiles.map((file) =>
    fs.readFileSync(path.join(mobileRoot, file), "utf8")
  )].join("\n");
}

/** Screen TSX modules only (excludes styles/assets/types). */
export function readDiscoveryScreenSources(mobileRoot: string) {
  const screenFiles = listDiscoveryModuleFiles(mobileRoot, [".tsx"]).filter(
    (file) => file.includes("Customer") || file.includes("Directory") || file.includes("Pagination") || file.includes("Promo") || file.includes("Card") || file.includes("Aside") || file.includes("Filters") || file.includes("Sidebar") || file.includes("Terms")
  );
  return [readDiscoveryRouter(mobileRoot), ...screenFiles.map((file) =>
    fs.readFileSync(path.join(mobileRoot, file), "utf8")
  )].join("\n");
}

export const discoveryModulePaths = (mobileRoot: string) => [
  DISCOVERY_ROUTER,
  ...listDiscoveryModuleFiles(mobileRoot, [".ts", ".tsx"]),
];
