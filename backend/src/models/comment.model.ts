/**
 * Comment model — Firestore CRUD for plan comments.
 *
 * Structure:
 *   Collection: "planComments"
 *   Document: {planId} — stores { commentCount: number } for fast count lookups
 *   Subcollection: "planComments/{planId}/comments" — individual comment documents
 *
 * The parent document tracks a denormalized commentCount that is incremented/decremented
 * when comments are added/deleted. This avoids counting subcollection docs on every request.
 * The count update is fire-and-forget (non-critical if it fails).
 */

import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanComment } from "../types.js";

const COMMENTS_COL = "planComments";

/** Get all comments for a plan, ordered newest first */
export async function getComments(planId: string): Promise<PlanComment[]> {
  const colRef = db.collection(COMMENTS_COL).doc(planId).collection("comments");
  const snap = await colRef.orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanComment[];
}

/** Get the total number of comments for a plan (by counting subcollection docs) */
export async function getCommentCount(planId: string): Promise<number> {
  const colRef = db.collection(COMMENTS_COL).doc(planId).collection("comments");
  const snap = await colRef.get();
  return snap.size;
}

/** Get all parent comment documents (used by engagement aggregation to get commentCounts) */
export async function getAllCommentDocs(): Promise<FirebaseFirestore.QuerySnapshot> {
  return db.collection(COMMENTS_COL).get();
}

/** Add a new comment to a plan. Returns the Firestore-generated document ID. */
export async function addComment(
  planId: string,
  commentData: Omit<PlanComment, "id">,
): Promise<string> {
  const parentRef = db.collection(COMMENTS_COL).doc(planId);
  const colRef = parentRef.collection("comments");
  const docRef = await colRef.add(commentData);
  // Increment the denormalized comment count on the parent doc (fire-and-forget)
  parentRef.set({ commentCount: FieldValue.increment(1) }, { merge: true }).catch(() => {});
  return docRef.id;
}

/** Look up a single comment — returns existence and userId (used for authorization checks before delete) */
export async function getCommentById(
  planId: string,
  commentId: string,
): Promise<{ exists: boolean; userId?: string }> {
  const docRef = db
    .collection(COMMENTS_COL)
    .doc(planId)
    .collection("comments")
    .doc(commentId);
  const snap = await docRef.get();
  if (!snap.exists) return { exists: false };
  return { exists: true, userId: snap.data()!.userId };
}

/** Delete a comment and decrement the parent's commentCount */
export async function deleteComment(planId: string, commentId: string): Promise<void> {
  const docRef = db
    .collection(COMMENTS_COL)
    .doc(planId)
    .collection("comments")
    .doc(commentId);
  await docRef.delete();
  // Decrement the denormalized comment count (fire-and-forget)
  db.collection(COMMENTS_COL)
    .doc(planId)
    .set({ commentCount: FieldValue.increment(-1) }, { merge: true })
    .catch(() => {});
}
