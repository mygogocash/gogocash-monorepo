import fs from "node:fs";
import path from "node:path";

const HOME_DIR = "src/screens/home";
const HOME_ROUTER = "src/screens/CustomerHomeScreen.tsx";

function listHomeModuleFiles(mobileRoot: string, extensions: readonly string[]) {
  const homePath = path.join(mobileRoot, HOME_DIR);
  return fs
    .readdirSync(homePath)
    .filter((file) => extensions.some((extension) => file.endsWith(extension)))
    .sort()
    .map((file) => path.join(HOME_DIR, file));
}

export function readHomeRouter(mobileRoot: string) {
  return fs.readFileSync(path.join(mobileRoot, HOME_ROUTER), "utf8");
}

/** Router + all home modules (components, styles, helpers, types). */
export function readHomeSources(mobileRoot: string) {
  const moduleFiles = listHomeModuleFiles(mobileRoot, [".ts", ".tsx"]);
  return [readHomeRouter(mobileRoot), ...moduleFiles.map((file) =>
    fs.readFileSync(path.join(mobileRoot, file), "utf8")
  )].join("\n");
}

export const homeModulePaths = (mobileRoot: string) => [
  HOME_ROUTER,
  ...listHomeModuleFiles(mobileRoot, [".ts", ".tsx"]),
];
