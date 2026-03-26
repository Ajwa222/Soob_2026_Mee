import { getAuthSync, getFirebaseAuth } from "../lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function getAuthHeader(): Promise<Record<string, string>> {
  // Try sync first (fast path when Firebase is already initialized)
  let auth = getAuthSync();
  // If Firebase hasn't initialized yet, await it
  if (!auth) auth = await getFirebaseAuth();
  const user = auth?.currentUser;
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
