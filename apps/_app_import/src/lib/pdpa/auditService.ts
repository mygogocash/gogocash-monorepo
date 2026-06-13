import { randomUUID } from "node:crypto";
import type { DataAccessAction } from "./constants";
import { withPdpaStore } from "./fileStore";

export async function logDataAccess(params: {
  userId: string;
  accessedBy: string;
  action: DataAccessAction;
  dataCategories: string[];
  purpose: string;
  ipAddressHashed: string;
  userAgent: string;
  endpoint: string;
  responseStatus: number;
  authorized: boolean;
  authorizationBasis: string;
}): Promise<void> {
  await withPdpaStore(async (doc) => {
    doc.dataAccessLogs.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...params,
    });
    return { doc, result: undefined };
  });
}
