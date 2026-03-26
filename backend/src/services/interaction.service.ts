/**
 * Interaction service — business logic for plan likes, dislikes, and comments.
 *
 * Key design:
 *  - Engagement data (aggregate like/dislike/comment counts for ALL plans) is cached
 *    in-memory with a 60-second TTL. This is the most frequently called endpoint
 *    (loaded on every page with plan cards), so avoiding Firestore hits is critical.
 *  - The cache is invalidated whenever a like/dislike/comment is added or removed.
 *  - Like/dislike toggling also updates segment stats (fire-and-forget) so that
 *    "popular with gamers" type recommendations stay up to date.
 */

import * as ReactionModel from "../models/reaction.model.js";
import * as CommentModel from "../models/comment.model.js";
import { isValidSegment } from "../lib/persona-scoring.js";
import { updateUserSegment } from "../lib/segment-stats.js";
import type { PlanReaction, PlanComment } from "../types.js";

// ── Engagement Cache ──
// Stores a pre-serialized JSON string of { [planId]: { likes, dislikes, comments } }
// Refreshed from Firestore every 60 seconds or when any interaction changes.
let engagementCache: { data: string; expires: number } | null = null;
const ENGAGEMENT_TTL = 60_000; // 60 seconds

/** Invalidate the engagement cache so the next request fetches fresh data from Firestore */
function invalidateEngagementCache() {
  engagementCache = null;
}

/**
 * Fetches aggregated engagement data for all plans (likes, dislikes, comment counts).
 * Returns pre-serialized JSON for fast response. Cached in-memory for 60 seconds.
 */
export async function getEngagement(): Promise<string> {
  if (engagementCache && Date.now() < engagementCache.expires) {
    return engagementCache.data;
  }

  // Fetch all reactions and comment docs in parallel from Firestore
  const [reactionsSnap, commentsSnap] = await Promise.all([
    ReactionModel.getAllReactions(),
    CommentModel.getAllCommentDocs(),
  ]);

  // Build the engagement map: { planId: { likes, dislikes, comments } }
  const engagement: Record<string, { likes: number; dislikes: number; comments: number }> = {};

  // Populate from reactions (likes & dislikes)
  for (const doc of reactionsSnap.docs) {
    const data = doc.data();
    engagement[doc.id] = {
      likes: Math.max(0, data.likes ?? 0),     // Guard against negative counts
      dislikes: Math.max(0, data.dislikes ?? 0),
      comments: 0,
    };
  }

  // Merge in comment counts
  for (const d of commentsSnap.docs) {
    const data = d.data();
    if (!engagement[d.id]) {
      engagement[d.id] = { likes: 0, dislikes: 0, comments: 0 };
    }
    engagement[d.id].comments = data.commentCount ?? 0;
  }

  const json = JSON.stringify(engagement);
  engagementCache = { data: json, expires: Date.now() + ENGAGEMENT_TTL };
  return json;
}

/** Get like/dislike data for a single plan */
export async function getReaction(planId: string): Promise<PlanReaction> {
  return ReactionModel.getReaction(planId);
}

/**
 * Core toggle logic for both likes and dislikes.
 *
 * Handles three scenarios:
 *  1. First-ever reaction on this plan → create the reaction document
 *  2. User already has this reaction → remove it (unlike/undislike)
 *  3. User doesn't have this reaction → add it, and remove the opposite if present
 *
 * Uses Firestore atomic operations (arrayUnion/arrayRemove/increment) to avoid race conditions.
 */
async function toggleReaction(
  planId: string,
  userId: string,
  type: "like" | "dislike",
  segment?: string,
): Promise<{ toggled: string }> {
  const current = await ReactionModel.getReaction(planId);

  const isLike = type === "like";
  const primaryField = isLike ? "likes" : "dislikes";
  const primaryArray = isLike ? "likedBy" : "dislikedBy";
  const oppositeField = isLike ? "dislikes" : "likes";
  const oppositeArray = isLike ? "dislikedBy" : "likedBy";

  const isEmpty = current.likes === 0 && current.dislikes === 0
    && current.likedBy.length === 0 && current.dislikedBy.length === 0;

  // Scenario 1: No reactions exist yet — create the initial reaction document
  if (isEmpty) {
    await ReactionModel.setReaction(planId, {
      likes: isLike ? 1 : 0,
      dislikes: isLike ? 0 : 1,
      likedBy: isLike ? [userId] : [],
      dislikedBy: isLike ? [] : [userId],
    });
    if (isLike) fireSegmentUpdate(userId, segment, planId, "add");
    invalidateEngagementCache();
    return { toggled: isLike ? "liked" : "disliked" };
  }

  const alreadyActive = current[primaryArray].includes(userId);
  const hasOpposite = current[oppositeArray].includes(userId);

  // Build an atomic update using Firestore FieldValue operations
  const updates: Record<string, unknown> = {};

  if (alreadyActive) {
    // Scenario 2: User already has this reaction → remove it (toggle off)
    updates[primaryArray] = ReactionModel.FieldValue.arrayRemove(userId);
    updates[primaryField] = ReactionModel.FieldValue.increment(-1);
  } else {
    // Scenario 3: Add the reaction, and remove opposite if they had one
    updates[primaryArray] = ReactionModel.FieldValue.arrayUnion(userId);
    updates[primaryField] = ReactionModel.FieldValue.increment(1);
    if (hasOpposite) {
      // User switched from dislike→like or vice versa — remove the opposite
      updates[oppositeArray] = ReactionModel.FieldValue.arrayRemove(userId);
      updates[oppositeField] = ReactionModel.FieldValue.increment(-1);
    }
  }

  await ReactionModel.updateReaction(planId, updates);
  invalidateEngagementCache();

  // Update segment stats (fire-and-forget) when likes change
  if (isLike) fireSegmentUpdate(userId, segment, planId, alreadyActive ? "remove" : "add");

  const toggledLabel = isLike
    ? (alreadyActive ? "unliked" : "liked")
    : (alreadyActive ? "undisliked" : "disliked");
  return { toggled: toggledLabel };
}

/** Toggle like on a plan — delegates to the shared toggleReaction logic */
export async function toggleLike(
  planId: string,
  userId: string,
  segment?: string,
): Promise<{ toggled: string }> {
  return toggleReaction(planId, userId, "like", segment);
}

/** Toggle dislike on a plan — delegates to the shared toggleReaction logic */
export async function toggleDislike(
  planId: string,
  userId: string,
): Promise<{ toggled: string }> {
  return toggleReaction(planId, userId, "dislike");
}

/** Get all comments for a plan (newest first) */
export async function getComments(planId: string): Promise<PlanComment[]> {
  return CommentModel.getComments(planId);
}

/** Get the total comment count for a plan */
export async function getCommentCount(planId: string): Promise<number> {
  return CommentModel.getCommentCount(planId);
}

/** Add a new comment to a plan. Returns the created comment with its Firestore-generated ID. */
export async function addComment(
  planId: string,
  userId: string,
  userName: string,
  userPhoto: string | null,
  text: string,
): Promise<PlanComment> {
  const commentData = {
    userId,
    userName,
    userPhoto,
    text: text.trim(),
    createdAt: Date.now(),
  };

  const id = await CommentModel.addComment(planId, commentData);
  invalidateEngagementCache(); // Comment count changed
  return { id, ...commentData };
}

/**
 * Delete a comment. Only the original author can delete their own comment.
 * Returns { deleted: true } on success, or { deleted: false, error, status } on failure.
 */
export async function deleteComment(
  planId: string,
  commentId: string,
  userId: string,
): Promise<{ deleted: boolean; error?: string; status?: number }> {
  const comment = await CommentModel.getCommentById(planId, commentId);

  if (!comment.exists) {
    return { deleted: false, error: "Comment not found", status: 404 };
  }

  // Authorization check — only the comment author can delete
  if (comment.userId !== userId) {
    return { deleted: false, error: "Not authorized to delete this comment", status: 403 };
  }

  await CommentModel.deleteComment(planId, commentId);
  invalidateEngagementCache(); // Comment count changed
  return { deleted: true };
}

/**
 * Fire-and-forget: update the user's segment stats when they like/unlike a plan.
 * This keeps the "popular with [segment]" recommendations accurate.
 * Errors are silently caught since this is non-critical.
 */
function fireSegmentUpdate(userId: string, segment: string | undefined, planId: string, action: "add" | "remove") {
  if (segment && isValidSegment(segment)) {
    updateUserSegment(userId, segment, Number(planId), action).catch(() => {});
  }
}
