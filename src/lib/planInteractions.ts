import {
  doc, getDoc, setDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc, increment, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PlanReaction, PlanComment, SimbaUser } from '../types';

const REACTIONS_COL = 'planReactions';
const COMMENTS_COL = 'planComments';

const defaultReaction: PlanReaction = { likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };

export async function fetchReaction(planId: number): Promise<PlanReaction> {
  const snap = await getDoc(doc(db, REACTIONS_COL, String(planId)));
  if (!snap.exists()) return { ...defaultReaction };
  const data = snap.data();
  return {
    likes: data.likes ?? 0,
    dislikes: data.dislikes ?? 0,
    likedBy: data.likedBy ?? [],
    dislikedBy: data.dislikedBy ?? [],
  };
}

export async function toggleLike(planId: number, userId: string): Promise<void> {
  const ref = doc(db, REACTIONS_COL, String(planId));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { likes: 1, dislikes: 0, likedBy: [userId], dislikedBy: [] });
    return;
  }

  const data = snap.data();
  const alreadyLiked = (data.likedBy ?? []).includes(userId);
  const alreadyDisliked = (data.dislikedBy ?? []).includes(userId);

  const updates: Record<string, unknown> = {};

  if (alreadyLiked) {
    updates.likedBy = arrayRemove(userId);
    updates.likes = increment(-1);
  } else {
    updates.likedBy = arrayUnion(userId);
    updates.likes = increment(1);
    if (alreadyDisliked) {
      updates.dislikedBy = arrayRemove(userId);
      updates.dislikes = increment(-1);
    }
  }

  await setDoc(ref, updates, { merge: true });
}

export async function toggleDislike(planId: number, userId: string): Promise<void> {
  const ref = doc(db, REACTIONS_COL, String(planId));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { likes: 0, dislikes: 1, likedBy: [], dislikedBy: [userId] });
    return;
  }

  const data = snap.data();
  const alreadyDisliked = (data.dislikedBy ?? []).includes(userId);
  const alreadyLiked = (data.likedBy ?? []).includes(userId);

  const updates: Record<string, unknown> = {};

  if (alreadyDisliked) {
    updates.dislikedBy = arrayRemove(userId);
    updates.dislikes = increment(-1);
  } else {
    updates.dislikedBy = arrayUnion(userId);
    updates.dislikes = increment(1);
    if (alreadyLiked) {
      updates.likedBy = arrayRemove(userId);
      updates.likes = increment(-1);
    }
  }

  await setDoc(ref, updates, { merge: true });
}

export async function fetchComments(planId: number): Promise<PlanComment[]> {
  const colRef = collection(db, COMMENTS_COL, String(planId), 'comments');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as PlanComment[];
}

export async function addComment(planId: number, user: SimbaUser, text: string): Promise<PlanComment> {
  const colRef = collection(db, COMMENTS_COL, String(planId), 'comments');
  const commentData = {
    userId: user.uid,
    userName: user.name,
    userPhoto: user.photoURL,
    text: text.trim(),
    createdAt: Date.now(),
  };
  const docRef = await addDoc(colRef, commentData);
  return { id: docRef.id, ...commentData };
}

export async function deleteComment(planId: number, commentId: string): Promise<void> {
  await deleteDoc(doc(db, COMMENTS_COL, String(planId), 'comments', commentId));
}
