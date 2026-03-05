import {
  doc, getDoc, setDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc, increment, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PlanReaction, PlanComment, SimbaUser } from '../types';

const REACTIONS_COL = 'planReactions';
const COMMENTS_COL = 'planComments';

const defaultReaction: PlanReaction = { likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };

/* ── In-memory cache (TTL: 5 min) ── */
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> { data: T; ts: number; }

const reactionCache = new Map<number, CacheEntry<PlanReaction>>();
const commentCountCache = new Map<number, CacheEntry<number>>();

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.ts < CACHE_TTL;
}

export function invalidateReactionCache(planId: number) {
  reactionCache.delete(planId);
}

export function invalidateCommentCache(planId: number) {
  commentCountCache.delete(planId);
}

export async function fetchReaction(planId: number): Promise<PlanReaction> {
  const cached = reactionCache.get(planId);
  if (isFresh(cached)) return cached.data;

  const snap = await getDoc(doc(db, REACTIONS_COL, String(planId)));
  const reaction: PlanReaction = !snap.exists()
    ? { ...defaultReaction }
    : {
        likes: snap.data().likes ?? 0,
        dislikes: snap.data().dislikes ?? 0,
        likedBy: snap.data().likedBy ?? [],
        dislikedBy: snap.data().dislikedBy ?? [],
      };
  reactionCache.set(planId, { data: reaction, ts: Date.now() });
  return reaction;
}

export async function fetchCommentCount(planId: number): Promise<number> {
  const cached = commentCountCache.get(planId);
  if (isFresh(cached)) return cached.data;

  const colRef = collection(db, COMMENTS_COL, String(planId), 'comments');
  const snap = await getDocs(query(colRef));
  const count = snap.size;
  commentCountCache.set(planId, { data: count, ts: Date.now() });
  return count;
}

export async function toggleLike(planId: number, userId: string): Promise<void> {
  invalidateReactionCache(planId);
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
  invalidateReactionCache(planId);
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
  invalidateCommentCache(planId);
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
  invalidateCommentCache(planId);
  await deleteDoc(doc(db, COMMENTS_COL, String(planId), 'comments', commentId));
}
