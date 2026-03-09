import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync, existsSync } from "fs";

const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (keyJson) {
  // Render / production: JSON string in env var
  const serviceAccount = JSON.parse(keyJson) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
} else if (keyPath && existsSync(keyPath)) {
  // Local dev: path to service-account.json file
  const serviceAccount = JSON.parse(
    readFileSync(keyPath, "utf-8"),
  ) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
} else {
  initializeApp();
}

export const db = getFirestore();
export const auth = getAuth();
