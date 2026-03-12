// Lazy Firebase initialization — modules load on first access, not at import time
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _googleProvider: GoogleAuthProviderType | null = null;
let _initPromise: Promise<void> | null = null;

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

export function getFirebaseAuth(): Promise<Auth> {
  if (_auth) return Promise.resolve(_auth);
  if (!_initPromise) _initPromise = init();
  return _initPromise.then(() => _auth!);
}

export function getFirebaseDb(): Promise<Firestore> {
  if (_db) return Promise.resolve(_db);
  if (!_initPromise) _initPromise = init();
  return _initPromise.then(() => _db!);
}

export function getGoogleProvider(): Promise<GoogleAuthProviderType> {
  if (_googleProvider) return Promise.resolve(_googleProvider);
  if (!_initPromise) _initPromise = init();
  return _initPromise.then(() => _googleProvider!);
}

// Synchronous getters for code that already awaited init
export function getAuthSync(): Auth | null { return _auth; }
export function getDbSync(): Firestore | null { return _db; }
