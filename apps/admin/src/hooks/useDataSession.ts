"use client";

import { useSession } from "next-auth/react";
import type { DataSession } from "@/types/authSession";

/**
 * NextAuth session typed for admin API calls (JWT access token, etc.).
 * Prefer this over repeating `data as { accessToken?: string }` in components.
 */
export function useDataSession(): DataSession {
  const { data } = useSession();
  if (!data) {
    return {};
  }
  return data as DataSession;
}
