import * as ReactionModel from "../models/reaction.model.js";
import * as CommentModel from "../models/comment.model.js";
import { isValidSegment } from "../lib/persona-scoring.js";
import { updateUserSegment } from "../lib/segment-stats.js";
import type { PlanReaction, PlanComment } from "../types.js";

// In-memory engagement cache (avoids hitting Firestore on every page load)
let engagementCache: { data: string; expires: number } | null = null;
const ENGAGEMENT_TTL = 60_000;

function invalidateEngagementCache() {
  engagementCache = null;
}

export async function getEngagement(): Promise<string> {
  if (engagementCache && Date.now() < engagementCache.expires) {
    return engagementCache.data;
  }

  const [reactionsSnap, commentsSnap] = await Promise.all([
    ReactionModel.getAllReactions(),
    CommentModel.getAllCommentDocs(),
  ]);

  const engagement: Record<string, { likes: number; dislikes: number; comments: number }> = {};

  for (const doc of reactionsSnap.docs) {
    const data = doc.data();
    engagement[doc.id] = {
      likes: Math.max(0, data.likes ?? 0),
      dislikes: Math.max(0, data.dislikes ?? 0),
      comments: 0,
    };
  }

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

export async function getReaction(planId: string): Promise<PlanReaction> {
  return ReactionModel.getReaction(planId);
}

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

  // First reaction on this plan
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

  const updates: Record<string, unknown> = {};

  if (alreadyActive) {
    updates[primaryArray] = ReactionModel.FieldValue.arrayRemove(userId);
    updates[primaryField] = ReactionModel.FieldValue.increment(-1);
  } else {
    updates[primaryArray] = ReactionModel.FieldValue.arrayUnion(userId);
    updates[primaryField] = ReactionModel.FieldValue.increment(1);
    if (hasOpposite) {
      updates[oppositeArray] = ReactionModel.FieldValue.arrayRemove(userId);
      updates[oppositeField] = ReactionModel.FieldValue.increment(-1);
    }
  }

  await ReactionModel.updateReaction(planId, updates);
  invalidateEngagementCache();

  if (isLike) fireSegmentUpdate(userId, segment, planId, alreadyActive ? "remove" : "add");

  const toggledLabel = isLike
    ? (alreadyActive ? "unliked" : "liked")
    : (alreadyActive ? "undisliked" : "disliked");
  return { toggled: toggledLabel };
}

export async function toggleLike(
  planId: string,
  userId: string,
  segment?: string,
): Promise<{ toggled: string }> {
  return toggleReaction(planId, userId, "like", segment);
}

export async function toggleDislike(
  planId: string,
  userId: string,
): Promise<{ toggled: string }> {
  return toggleReaction(planId, userId, "dislike");
}

export async function getComments(planId: string): Promise<PlanComment[]> {
  return CommentModel.getComments(planId);
}

export async function getCommentCount(planId: string): Promise<number> {
  return CommentModel.getCommentCount(planId);
}

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
  invalidateEngagementCache();
  return { id, ...commentData };
}

export async function deleteComment(
  planId: string,
  commentId: string,
  userId: string,
): Promise<{ deleted: boolean; error?: string; status?: number }> {
  const comment = await CommentModel.getCommentById(planId, commentId);

  if (!comment.exists) {
    return { deleted: false, error: "Comment not found", status: 404 };
  }

  if (comment.userId !== userId) {
    return { deleted: false, error: "Not authorized to delete this comment", status: 403 };
  }

  await CommentModel.deleteComment(planId, commentId);
  invalidateEngagementCache();
  return { deleted: true };
}

function fireSegmentUpdate(userId: string, segment: string | undefined, planId: string, action: "add" | "remove") {
  if (segment && isValidSegment(segment)) {
    updateUserSegment(userId, segment, Number(planId), action).catch(() => {});
  }
}
