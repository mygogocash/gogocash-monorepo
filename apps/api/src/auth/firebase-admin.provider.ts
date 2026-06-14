import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function getAdminAuth() {
  if (!getApps().length) {
    if (!getApps().length) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        credential: applicationDefault(),
      });
    }
  }
  return getAuth();
}
