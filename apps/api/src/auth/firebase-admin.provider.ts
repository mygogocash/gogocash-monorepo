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
