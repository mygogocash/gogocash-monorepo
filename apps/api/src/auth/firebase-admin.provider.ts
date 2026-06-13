import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

export function getAdminAuth() {
  if (!getApps().length) {
    if (!getApps().length) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        credential: admin.credential.applicationDefault(),
      });
    }
  }
  return getAuth();
}
