"use client";

import { useSession } from "next-auth/react";
import type { DataSession } from "@/types/authSession";

/**
 * NextAuth session typed for admin UI (user/role). Nest JWT stays server-side.
 */
export function useDataSession(): DataSession {
  const { data } = useSession();
  if (!data) {
    return {};
  }
  return data as DataSession;
}
