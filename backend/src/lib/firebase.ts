/**
 * Firebase Admin SDK initialization.
 *
 * Supports two credential methods:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY — JSON string in env var (used in production on Render)
 *  2. GOOGLE_APPLICATION_CREDENTIALS — file path to a service-account.json (used in local dev)
 *  3. Falls back to Application Default Credentials (ADC) if neither is set
 *
 * Exports `db` (Firestore) and `auth` (Firebase Auth) singletons used throughout the backend.
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync, existsSync } from "fs";

const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (keyJson) {
  // Production (Render): credentials stored as a JSON string in an env var
  const serviceAccount = JSON.parse(keyJson) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
} else if (keyPath && existsSync(keyPath)) {
  // Local dev: credentials stored as a file on disk
  const serviceAccount = JSON.parse(
    readFileSync(keyPath, "utf-8"),
  ) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
} else {
  // Fallback: use Application Default Credentials (e.g., when running on GCP)
  initializeApp();
}

/** Firestore database instance — used by all models for CRUD operations */
export const db = getFirestore();

/** Firebase Auth instance — used by the auth middleware to verify ID tokens */
export const auth = getAuth();
