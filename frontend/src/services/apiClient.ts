/**
 * Central API client for all frontend-to-backend communication.
 *
 * Provides two fetch wrappers:
 *  - apiFetch()    — authenticated requests (auto-attaches Firebase ID token as Bearer header)
 *  - publicFetch() — unauthenticated requests for public endpoints (no token overhead)
 *
 * Both target the backend base URL from VITE_API_URL (defaults to localhost:3001 in dev).
 * Responses are parsed as JSON; non-2xx responses throw an Error with the server's error message.
 */
import { getFirebaseAuth } from "../lib/firebase";

// Backend base URL — injected by Vite from .env
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Waits for Firebase Auth to resolve the current user.
 *
 * On page load, AuthContext restores the user from localStorage (sync), but
 * Firebase Auth hasn't initialized yet — so auth.currentUser is null.
 * This promise waits for onAuthStateChanged to fire once, ensuring currentUser is set.
 */
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

/**
 * Returns { Authorization: "Bearer <idToken>" } if a user is signed in, or {} if not.
 * Waits for Firebase Auth to be ready before checking currentUser.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  await waitForAuthReady();
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Authenticated fetch wrapper — auto-attaches Firebase ID token.
 * Used for all endpoints that require auth (reactions, comments, advisor).
 *
 * @param path    - API path (e.g. "/api/plans/123")
 * @param options - Standard RequestInit (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws Error with server message on non-2xx responses
 */
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
