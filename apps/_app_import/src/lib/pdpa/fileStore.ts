import path from "node:path";
import type { PdpaStoreDocument } from "./types";
import { DEFAULT_PROCESSING_ACTIVITIES } from "./seed/processingActivities";
import { DEFAULT_TRANSFER_AGREEMENTS } from "./seed/transferAgreements";

/** Static path segments keep Turbopack file tracing scoped to `data/pdpa/store.json`. */
const DEFAULT_STORE_SEGMENTS = ["data", "pdpa", "store.json"] as const;

function getStorePath(): string {
  const custom = process.env.PDPA_STORE_PATH?.trim();
  if (custom) {
    if (!path.isAbsolute(custom)) {
      throw new Error(
        "PDPA_STORE_PATH must be an absolute filesystem path. Unset it to use the default data/pdpa/store.json under the app root."
      );
    }
    return custom;
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...DEFAULT_STORE_SEGMENTS);
}

function emptyDoc(): PdpaStoreDocument {
  return {
    consentRecords: [],
    dataSubjectRequests: [],
    dataBreachLogs: [],
    processingActivities: [...DEFAULT_PROCESSING_ACTIVITIES],
    dataTransferAgreements: [...DEFAULT_TRANSFER_AGREEMENTS],
    dataAccessLogs: [],
    purgeAuditLogs: [],
    userRestriction: {},
    userProfiles: {},
  };
}

let chain: Promise<void> = Promise.resolve();

export async function readPdpaStore(): Promise<PdpaStoreDocument> {
  const { readFile } = await import("node:fs/promises");
  const storePath = getStorePath();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as PdpaStoreDocument;
    if (!parsed.processingActivities?.length) {
      parsed.processingActivities = [...DEFAULT_PROCESSING_ACTIVITIES];
    }
    if (!parsed.dataTransferAgreements?.length) {
      parsed.dataTransferAgreements = [...DEFAULT_TRANSFER_AGREEMENTS];
    }
    if (!parsed.userRestriction) parsed.userRestriction = {};
    if (!parsed.userProfiles) parsed.userProfiles = {};
    return parsed;
  } catch {
    return emptyDoc();
  }
}

export async function writePdpaStore(doc: PdpaStoreDocument): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const storePath = getStorePath();
  const dir = path.dirname(storePath);
  await mkdir(dir, { recursive: true });
  await writeFile(storePath, JSON.stringify(doc, null, 2), "utf8");
}

/** Serialize writes to avoid corrupt JSON under concurrent requests. */
export function withPdpaStore<T>(
  fn: (doc: PdpaStoreDocument) => Promise<{ doc: PdpaStoreDocument; result: T }>
): Promise<T> {
  const run = chain.then(async () => {
    const doc = await readPdpaStore();
    const { doc: next, result } = await fn(doc);
    await writePdpaStore(next);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function getPdpaSalt(): string {
  const s = process.env.NEXTAUTH_SECRET?.trim();
  return s ? s.slice(0, Math.min(32, s.length)) : "pdpa-dev-salt-only";
}
