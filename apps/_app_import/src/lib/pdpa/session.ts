import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authFirebase";

export type SessionUserId = string;

/** Resolve stable user id from NextAuth session (Firebase user `_id`). */
export function getUserIdFromSession(session: Session | null): SessionUserId | null {
  if (!session?.user) return null;
  const u = session.user as { _id?: string; email?: string | null };
  if (u._id) return String(u._id);
  if (u.email) return `email:${u.email}`;
  return null;
}

export async function getPdpaSessionUserId(): Promise<SessionUserId | null> {
  const session = await getServerSession(authOptions);
  return getUserIdFromSession(session);
}
