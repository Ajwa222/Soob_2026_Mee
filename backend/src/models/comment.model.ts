import { db } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanComment } from "../types.js";

const COMMENTS_COL = "planComments";

export async function getComments(planId: string): Promise<PlanComment[]> {
  const colRef = db.collection(COMMENTS_COL).doc(planId).collection("comments");
  const snap = await colRef.orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanComment[];
}

export async function getCommentCount(planId: string): Promise<number> {
  const colRef = db.collection(COMMENTS_COL).doc(planId).collection("comments");
  const snap = await colRef.get();
  return snap.size;
}

export async function getAllCommentDocs(): Promise<FirebaseFirestore.QuerySnapshot> {
  return db.collection(COMMENTS_COL).get();
}

export async function addComment(
  planId: string,
  commentData: Omit<PlanComment, "id">,
): Promise<string> {
  const parentRef = db.collection(COMMENTS_COL).doc(planId);
  const colRef = parentRef.collection("comments");
  const docRef = await colRef.add(commentData);
  parentRef.set({ commentCount: FieldValue.increment(1) }, { merge: true }).catch(() => {});
  return docRef.id;
}

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

export async function deleteComment(planId: string, commentId: string): Promise<void> {
  const docRef = db
    .collection(COMMENTS_COL)
    .doc(planId)
    .collection("comments")
    .doc(commentId);
  await docRef.delete();
  db.collection(COMMENTS_COL)
    .doc(planId)
    .set({ commentCount: FieldValue.increment(-1) }, { merge: true })
    .catch(() => {});
}
