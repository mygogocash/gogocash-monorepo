import {
  applicationDefault,
  getApps,
  initializeApp,
  type AppOptions,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function getAdminAuth() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      throw new Error(
        'FIREBASE_PROJECT_ID is required for Firebase Admin (phone login token verification).',
      );
    }

    const options: AppOptions = { projectId };
    // Railway has no ambient GCP identity. verifyIdToken only needs projectId +
    // Google's public certs; ADC is optional for GCS and other privileged ops.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
      options.credential = applicationDefault();
    }

    initializeApp(options);
  }
  return getAuth();
}

/**
 * Optional second Firebase project accepted during the beta→production
 * cutover window. While the fleet migrates from the staging Firebase project
 * to production, tokens minted by either project must keep working or every
 * user on a not-yet-updated build is locked out. Unset (or equal to the
 * primary) means no fallback. Remove FIREBASE_SECONDARY_PROJECT_ID once the
 * old builds are retired.
 */
const SECONDARY_APP_NAME = 'cutover-secondary';

export function getSecondaryAdminAuth(): ReturnType<typeof getAuth> | null {
  const secondaryId = process.env.FIREBASE_SECONDARY_PROJECT_ID?.trim();
  const primaryId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!secondaryId || secondaryId === primaryId) {
    return null;
  }
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  const app =
    existing ?? initializeApp({ projectId: secondaryId }, SECONDARY_APP_NAME);
  return getAuth(app);
}

/**
 * Verify a Firebase ID token against the primary project, falling back to
 * the secondary project during the cutover window. The primary project's
 * error is what callers see when both reject.
 */
export async function verifyFirebaseIdToken(token: string) {
  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (primaryError) {
    const secondary = getSecondaryAdminAuth();
    if (!secondary) {
      throw primaryError;
    }
    try {
      return await secondary.verifyIdToken(token);
    } catch {
      throw primaryError;
    }
  }
}
