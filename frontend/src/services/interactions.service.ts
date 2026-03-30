/**
 * Interactions service — handles plan reactions (like/dislike) and comments.
 *
 * Features:
 *  - In-memory cache with 5-minute TTL for reactions and comment counts
 *  - In-flight deduplication: concurrent fetches for the same planId share one promise
 *  - Cache invalidation on mutations (like, dislike, add/delete comment)
 *
 * All mutating endpoints require authentication (handled by apiFetch).
 */
import { apiFetch } from "./apiClient";
import type { PlanReaction, PlanComment } from "../types";

/* ── In-memory cache (TTL: 5 min) ── */
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> { data: T; ts: number; }

const reactionCache = new Map<number, CacheEntry<PlanReaction>>();
const commentCountCache = new Map<number, CacheEntry<number>>();

/* ── In-flight deduplication: reuse pending promises for the same planId ── */
const inFlightReactions = new Map<number, Promise<PlanReaction>>();
const inFlightComments = new Map<number, Promise<number>>();

/** Returns true if the cache entry exists and hasn't expired. */
function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.ts < CACHE_TTL;
}

/** Clear cached reaction data for a plan (called before mutation). */
export function invalidateReactionCache(planId: number) {
  reactionCache.delete(planId);
}

/** Clear cached comment count for a plan (called before mutation). */
export function invalidateCommentCache(planId: number) {
  commentCountCache.delete(planId);
}

/** Fetch reaction counts for a plan (cached, deduplicated). */
export const fetchReaction = async (planId: number): Promise<PlanReaction> => {
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
};

/** Fetch comment count for a plan (cached, deduplicated). */
export const fetchCommentCount = async (planId: number): Promise<number> => {
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
};

/** POST /api/plan-interactions/:id/reactions/like — toggle like for the authenticated user. */
export const toggleLike = async (planId: number): Promise<void> => {
  invalidateReactionCache(planId);
  await apiFetch(`/api/plan-interactions/${planId}/reactions/like`, { method: "POST" });
};

/** POST /api/plan-interactions/:id/reactions/dislike — toggle dislike for the authenticated user. */
export const toggleDislike = async (planId: number): Promise<void> => {
  invalidateReactionCache(planId);
  await apiFetch(`/api/plan-interactions/${planId}/reactions/dislike`, { method: "POST" });
};

/** GET /api/plan-interactions/:id/comments — fetch all comments for a plan. */
export const fetchComments = async (planId: number): Promise<PlanComment[]> => {
  return apiFetch<PlanComment[]>(`/api/plan-interactions/${planId}/comments`);
};

/** POST /api/plan-interactions/:id/comments — add a new comment (max 500 chars, enforced server-side). */
export const addComment = async (planId: number, text: string): Promise<PlanComment> => {
  invalidateCommentCache(planId);
  return apiFetch<PlanComment>(`/api/plan-interactions/${planId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
};

/** DELETE /api/plan-interactions/:id/comments/:cid — delete own comment (author-only, enforced server-side). */
export const deleteComment = async (planId: number, commentId: string): Promise<void> => {
  invalidateCommentCache(planId);
  await apiFetch(`/api/plan-interactions/${planId}/comments/${commentId}`, { method: "DELETE" });
};
