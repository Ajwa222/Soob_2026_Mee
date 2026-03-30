/**
 * Lazy Firebase initialization for the frontend.
 *
 * Firebase SDK modules (app, auth, firestore) are dynamically imported on first use
 * rather than at module load time. This keeps Firebase out of the initial JS bundle,
 * shaving ~50 KB off the critical path.
 *
 * Usage pattern:
 *   const auth = await getFirebaseAuth();    // triggers init on first call
 *   const db   = await getFirebaseDb();      // resolves instantly after init
 */
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth';

// Firebase project config — values injected by Vite from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy-initialized singletons — null until init() runs
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _googleProvider: GoogleAuthProviderType | null = null;
let _initPromise: Promise<void> | null = null;  // Ensures init() runs only once

/**
 * Dynamically imports Firebase modules and initializes the app.
 * Called once on first access; subsequent calls are no-ops.
 */
async function init() {
  if (_auth) return;
  const { initializeApp } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
  const { getFirestore } = await import('firebase/firestore');
  const app = initializeApp(firebaseConfig);
  _auth = getAuth(app);
  _db = getFirestore(app);
  _googleProvider = new GoogleAuthProvider();
}

// ── Async getters (trigger init on first call, resolve instantly after) ──

/** Returns the Firebase Auth instance, initializing Firebase if needed. */
export function getFirebaseAuth(): Promise<Auth> {
  if (_auth) return Promise.resolve(_auth);
  if (!_initPromise) _initPromise = init();
  return _initPromise.then(() => _auth!);
}

/** Returns the Firestore instance, initializing Firebase if needed. */
export function getFirebaseDb(): Promise<Firestore> {
  if (_db) return Promise.resolve(_db);
  if (!_initPromise) _initPromise = init();
  return _initPromise.then(() => _db!);
}

/** Returns the Google Auth provider, initializing Firebase if needed. */
export function getGoogleProvider(): Promise<GoogleAuthProviderType> {
  if (_googleProvider) return Promise.resolve(_googleProvider);
  if (!_initPromise) _initPromise = init();
  return _initPromise.then(() => _googleProvider!);
}

