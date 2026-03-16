import { apiFetch } from './api';
import type { PlanReaction, PlanComment, SimbaUser } from '../types';

/* ── In-memory cache (TTL: 5 min) ── */
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> { data: T; ts: number; }

const reactionCache = new Map<number, CacheEntry<PlanReaction>>();
const commentCountCache = new Map<number, CacheEntry<number>>();

/* ── In-flight deduplication: reuse pending promises for the same planId ── */
const inFlightReactions = new Map<number, Promise<PlanReaction>>();
const inFlightComments = new Map<number, Promise<number>>();

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

  const inFlight = inFlightReactions.get(planId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const reaction = await apiFetch<PlanReaction>(`/api/plan-interactions/${planId}/reactions`);
      reactionCache.set(planId, { data: reaction, ts: Date.now() });
      return reaction;
    } finally {
      inFlightReactions.delete(planId);
    }
  })();

  inFlightReactions.set(planId, promise);
  return promise;
}

export async function fetchCommentCount(planId: number): Promise<number> {
  const cached = commentCountCache.get(planId);
  if (isFresh(cached)) return cached.data;

  const inFlight = inFlightComments.get(planId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const { count } = await apiFetch<{ count: number }>(`/api/plan-interactions/${planId}/comments/count`);
      commentCountCache.set(planId, { data: count, ts: Date.now() });
      return count;
    } finally {
      inFlightComments.delete(planId);
    }
  })();

  inFlightComments.set(planId, promise);
  return promise;
}

export async function toggleLike(planId: number, _userId: string, segment?: string): Promise<void> {
  invalidateReactionCache(planId);
  await apiFetch(`/api/plan-interactions/${planId}/reactions/like`, {
    method: 'POST',
    headers: segment ? { 'x-persona-segment': segment } : undefined,
  });
}

export async function toggleDislike(planId: number, _userId: string, segment?: string): Promise<void> {
  invalidateReactionCache(planId);
  await apiFetch(`/api/plan-interactions/${planId}/reactions/dislike`, {
    method: 'POST',
    headers: segment ? { 'x-persona-segment': segment } : undefined,
  });
}

export async function fetchComments(planId: number): Promise<PlanComment[]> {
  return apiFetch<PlanComment[]>(`/api/plan-interactions/${planId}/comments`);
}

export async function addComment(planId: number, _user: SimbaUser, text: string): Promise<PlanComment> {
  invalidateCommentCache(planId);
  return apiFetch<PlanComment>(`/api/plan-interactions/${planId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function deleteComment(planId: number, commentId: string): Promise<void> {
  invalidateCommentCache(planId);
  await apiFetch(`/api/plan-interactions/${planId}/comments/${commentId}`, { method: 'DELETE' });
}
