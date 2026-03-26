/**
 * Reaction model — Firestore CRUD for plan likes and dislikes.
 *
 * Collection: "planReactions"
 * Document ID: plan ID (string)
 * Document shape: { likes: number, dislikes: number, likedBy: string[], dislikedBy: string[] }
 *
 * Each plan has one document that tracks its total counts and the list of user IDs
 * who liked/disliked it. The arrays allow toggling (check if user already reacted).
 */

import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanReaction } from "../types.js";

const REACTIONS_COL = "planReactions";

/** Default reaction data for plans that have never been reacted to */
const defaultReaction: PlanReaction = {
  likes: 0,
  dislikes: 0,
  likedBy: [],
  dislikedBy: [],
};

/** Get the reaction data for a single plan. Returns defaults if no document exists. */
export async function getReaction(planId: string): Promise<PlanReaction> {
  const snap = await db.collection(REACTIONS_COL).doc(planId).get();
  if (!snap.exists) return { ...defaultReaction };
  const data = snap.data()!;
  return {
    likes: Math.max(0, data.likes ?? 0),     // Guard against negative counts from race conditions
    dislikes: Math.max(0, data.dislikes ?? 0),
    likedBy: data.likedBy ?? [],
    dislikedBy: data.dislikedBy ?? [],
  };
}

/** Get all reaction documents (used by the engagement aggregation endpoint) */
export async function getAllReactions(): Promise<FirebaseFirestore.QuerySnapshot> {
  return db.collection(REACTIONS_COL).get();
}

/** Create or overwrite the reaction document for a plan (used for first-ever reaction) */
export async function setReaction(planId: string, data: PlanReaction): Promise<void> {
  await db.collection(REACTIONS_COL).doc(planId).set(data);
}

/** Partially update a reaction document using Firestore atomic operations (increment, arrayUnion, etc.) */
export async function updateReaction(planId: string, updates: Record<string, unknown>): Promise<void> {
  await db.collection(REACTIONS_COL).doc(planId).update(updates);
}

// Re-export FieldValue so the service layer can use arrayUnion/arrayRemove/increment
export { FieldValue };
