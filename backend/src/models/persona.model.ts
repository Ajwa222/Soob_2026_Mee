/**
 * Persona model — Firestore CRUD for user personas and segments.
 *
 * Uses two Firestore collections:
 *
 *   "users" — one doc per user (keyed by Firebase UID)
 *     - persona: PersonaProfile (segment, confidence, quiz answers, signals)
 *     - pendingSignals: PersonaSignals (behavioral data collected before persona was created)
 *
 *   "userSegments" — one doc per user (keyed by Firebase UID)
 *     - segment: string (the user's current segment)
 *     - likedPlans: number[] (plan IDs the user liked — used for segment stats aggregation)
 *     - updatedAt: number
 *
 * The "users" collection holds the user's full persona data.
 * The "userSegments" collection is a lightweight index used by segment-stats.ts to
 * aggregate "popular with [segment]" data without loading full user documents.
 */

import { db } from "../lib/firebase.js";
import type { PersonaProfile, PersonaSignals } from "../types.js";

const USERS_COL = "users";
const USER_SEGMENTS_COL = "userSegments";

/** Fetch a user's persona and pending signals from the "users" collection */
export async function getUserDoc(uid: string): Promise<{
  persona?: PersonaProfile;
  pendingSignals?: PersonaSignals;
} | null> {
  const snap = await db.collection(USERS_COL).doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    persona: data.persona as PersonaProfile | undefined,
    pendingSignals: data.pendingSignals as PersonaSignals | undefined,
  };
}

/**
 * Save a persona profile to the user's document.
 * Uses merge to preserve other fields on the document.
 * Optionally clears pending signals (when they've been merged into the persona).
 */
export async function savePersona(
  uid: string,
  profile: PersonaProfile,
  clearPending: boolean,
): Promise<void> {
  const writeData: Record<string, unknown> = { persona: profile };
  if (clearPending) writeData.pendingSignals = null;
  await db.collection(USERS_COL).doc(uid).set(writeData, { merge: true });
}

/** Clear the user's persona entirely — nulls both persona and pending signals, removes segment doc */
export async function clearPersona(uid: string): Promise<void> {
  await db.collection(USERS_COL).doc(uid).set(
    { persona: null, pendingSignals: null },
    { merge: true },
  );
  // Remove from userSegments so they no longer appear in segment stats
  await db.collection(USER_SEGMENTS_COL).doc(uid).delete().catch(() => {});
}

/** Update just the signals portion of an existing persona (deep merge via merge: true) */
export async function updatePersonaSignals(uid: string, signals: PersonaSignals): Promise<void> {
  await db.collection(USERS_COL).doc(uid).set(
    { persona: { signals, updatedAt: Date.now() } },
    { merge: true },
  );
}

/** Save behavioral signals as "pending" for users who don't have a persona yet */
export async function savePendingSignals(uid: string, signals: PersonaSignals): Promise<void> {
  await db.collection(USERS_COL).doc(uid).set(
    { pendingSignals: signals, pendingSignalsUpdatedAt: Date.now() },
    { merge: true },
  );
}

/** Track a user's segment in the lightweight "userSegments" collection (used for stats aggregation) */
export async function saveUserSegment(uid: string, segment: string): Promise<void> {
  await db.collection(USER_SEGMENTS_COL).doc(uid).set(
    { segment, updatedAt: Date.now() },
    { merge: true },
  );
}
