import { getFirebaseAuth } from "../lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Wait for Firebase Auth to resolve the current user.
// On page load, AuthContext restores the user from localStorage (sync), but
// Firebase Auth hasn't initialized yet — so auth.currentUser is null.
// This promise waits for onAuthStateChanged to fire once, ensuring currentUser is set.
let _authReady: Promise<void> | null = null;
function waitForAuthReady(): Promise<void> {
  if (_authReady) return _authReady;
  _authReady = getFirebaseAuth().then(async (auth) => {
    if (auth.currentUser) return;
    const { onAuthStateChanged } = await import("firebase/auth");
    return new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  });
  return _authReady;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  await waitForAuthReady();
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Lightweight fetch without auth — for public, high-traffic endpoints
 * where skipping the token fetch improves performance.
 */
export async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);

  if (!res.ok) throw new Error(`API error ${res.status}`);

  return res.json() as Promise<T>;
}
