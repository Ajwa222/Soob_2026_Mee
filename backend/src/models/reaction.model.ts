import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanReaction } from "../types.js";

const REACTIONS_COL = "planReactions";

const defaultReaction: PlanReaction = {
  likes: 0,
  dislikes: 0,
  likedBy: [],
  dislikedBy: [],
};

export async function getReaction(planId: string): Promise<PlanReaction> {
  const snap = await db.collection(REACTIONS_COL).doc(planId).get();
  if (!snap.exists) return { ...defaultReaction };
  const data = snap.data()!;
  return {
    likes: Math.max(0, data.likes ?? 0),
    dislikes: Math.max(0, data.dislikes ?? 0),
    likedBy: data.likedBy ?? [],
    dislikedBy: data.dislikedBy ?? [],
  };
}

export async function getAllReactions(): Promise<FirebaseFirestore.QuerySnapshot> {
  return db.collection(REACTIONS_COL).get();
}

export async function setReaction(planId: string, data: PlanReaction): Promise<void> {
  await db.collection(REACTIONS_COL).doc(planId).set(data);
}

export async function updateReaction(planId: string, updates: Record<string, unknown>): Promise<void> {
  await db.collection(REACTIONS_COL).doc(planId).update(updates);
}

export { FieldValue };
