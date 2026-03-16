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

export async function toggleLike(
  planId: string,
  userId: string,
  segment?: string,
): Promise<{ toggled: string }> {
  const current = await ReactionModel.getReaction(planId);

  // First reaction on this plan
  if (current.likes === 0 && current.dislikes === 0 && current.likedBy.length === 0 && current.dislikedBy.length === 0) {
    await ReactionModel.setReaction(planId, {
      likes: 1,
      dislikes: 0,
      likedBy: [userId],
      dislikedBy: [],
    });
    fireSegmentUpdate(userId, segment, planId, "add");
    invalidateEngagementCache();
    return { toggled: "liked" };
  }

  const alreadyLiked = current.likedBy.includes(userId);
  const alreadyDisliked = current.dislikedBy.includes(userId);

  const updates: Record<string, unknown> = {};

  if (alreadyLiked) {
    updates.likedBy = ReactionModel.FieldValue.arrayRemove(userId);
    updates.likes = ReactionModel.FieldValue.increment(-1);
  } else {
    updates.likedBy = ReactionModel.FieldValue.arrayUnion(userId);
    updates.likes = ReactionModel.FieldValue.increment(1);
    if (alreadyDisliked) {
      updates.dislikedBy = ReactionModel.FieldValue.arrayRemove(userId);
      updates.dislikes = ReactionModel.FieldValue.increment(-1);
    }
  }

  await ReactionModel.updateReaction(planId, updates);
  invalidateEngagementCache();

  fireSegmentUpdate(userId, segment, planId, alreadyLiked ? "remove" : "add");

  return { toggled: alreadyLiked ? "unliked" : "liked" };
}

export async function toggleDislike(
  planId: string,
  userId: string,
): Promise<{ toggled: string }> {
  const current = await ReactionModel.getReaction(planId);

  if (current.likes === 0 && current.dislikes === 0 && current.likedBy.length === 0 && current.dislikedBy.length === 0) {
    await ReactionModel.setReaction(planId, {
      likes: 0,
      dislikes: 1,
      likedBy: [],
      dislikedBy: [userId],
    });
    invalidateEngagementCache();
    return { toggled: "disliked" };
  }

  const alreadyDisliked = current.dislikedBy.includes(userId);
  const alreadyLiked = current.likedBy.includes(userId);

  const updates: Record<string, unknown> = {};

  if (alreadyDisliked) {
    updates.dislikedBy = ReactionModel.FieldValue.arrayRemove(userId);
    updates.dislikes = ReactionModel.FieldValue.increment(-1);
  } else {
    updates.dislikedBy = ReactionModel.FieldValue.arrayUnion(userId);
    updates.dislikes = ReactionModel.FieldValue.increment(1);
    if (alreadyLiked) {
      updates.likedBy = ReactionModel.FieldValue.arrayRemove(userId);
      updates.likes = ReactionModel.FieldValue.increment(-1);
    }
  }

  await ReactionModel.updateReaction(planId, updates);
  invalidateEngagementCache();
  return { toggled: alreadyDisliked ? "undisliked" : "disliked" };
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
