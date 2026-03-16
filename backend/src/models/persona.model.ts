import { db } from "../lib/firebase.js";
import type { PersonaProfile, PersonaSignals } from "../types.js";

const USERS_COL = "users";
const USER_SEGMENTS_COL = "userSegments";

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

export async function savePersona(
  uid: string,
  profile: PersonaProfile,
  clearPending: boolean,
): Promise<void> {
  const writeData: Record<string, unknown> = { persona: profile };
  if (clearPending) writeData.pendingSignals = null;
  await db.collection(USERS_COL).doc(uid).set(writeData, { merge: true });
}

export async function clearPersona(uid: string): Promise<void> {
  await db.collection(USERS_COL).doc(uid).set(
    { persona: null, pendingSignals: null },
    { merge: true },
  );
  await db.collection(USER_SEGMENTS_COL).doc(uid).delete().catch(() => {});
}

export async function updatePersonaSignals(uid: string, signals: PersonaSignals): Promise<void> {
  await db.collection(USERS_COL).doc(uid).set(
    { persona: { signals, updatedAt: Date.now() } },
    { merge: true },
  );
}

export async function savePendingSignals(uid: string, signals: PersonaSignals): Promise<void> {
  await db.collection(USERS_COL).doc(uid).set(
    { pendingSignals: signals, pendingSignalsUpdatedAt: Date.now() },
    { merge: true },
  );
}

export async function saveUserSegment(uid: string, segment: string): Promise<void> {
  await db.collection(USER_SEGMENTS_COL).doc(uid).set(
    { segment, updatedAt: Date.now() },
    { merge: true },
  );
}
