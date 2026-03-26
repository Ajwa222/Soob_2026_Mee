/**
 * Interactions controller — handles likes, dislikes, and comments on plans.
 *
 * Each handler validates the plan ID, delegates to the service layer, and
 * wraps everything in try/catch for consistent error responses.
 *
 * Authenticated endpoints cast `req` to AuthenticatedRequest to access uid/userName/userPhoto
 * populated by the requireAuth middleware.
 */

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { validatePlanId } from "../utils/validate.js";
import * as InteractionService from "../services/interaction.service.js";

/** GET /engagement — Batch fetch all plans' like/dislike/comment counts (pre-serialized JSON) */
export const getEngagement = async (_req: Request, res: Response) => {
  try {
    const json = await InteractionService.getEngagement();
    res.send(json);
  } catch (err) {
    console.error("Fetch engagement error:", err);
    res.status(500).json({ error: "Failed to fetch engagement" });
  }
};

/** GET /:id/reactions — Get like/dislike data for a single plan */
export const getReaction = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return; // validatePlanId already sent 400
    const reaction = await InteractionService.getReaction(planId);
    res.json(reaction);
  } catch (err) {
    console.error("Fetch reaction error:", err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
};

/** POST /:id/reactions/like — Toggle like (like ↔ unlike). Also updates segment stats if segment header is present. */
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return;
    const userId = (req as AuthenticatedRequest).uid!;
    // Frontend sends the user's persona segment via a custom header for segment stats tracking
    const segment = req.headers["x-persona-segment"] as string | undefined;
    const result = await InteractionService.toggleLike(planId, userId, segment);
    res.json(result);
  } catch (err) {
    console.error("Toggle like error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
};

/** POST /:id/reactions/dislike — Toggle dislike (dislike ↔ undislike) */
export const toggleDislike = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return;
    const userId = (req as AuthenticatedRequest).uid!;
    const result = await InteractionService.toggleDislike(planId, userId);
    res.json(result);
  } catch (err) {
    console.error("Toggle dislike error:", err);
    res.status(500).json({ error: "Failed to toggle dislike" });
  }
};

/** GET /:id/comments — Get all comments for a plan, newest first */
export const getComments = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return;
    const comments = await InteractionService.getComments(planId);
    res.json(comments);
  } catch (err) {
    console.error("Fetch comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

/** GET /:id/comments/count — Get the comment count for a plan */
export const getCommentCount = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return;
    const count = await InteractionService.getCommentCount(planId);
    res.json({ count });
  } catch (err) {
    console.error("Fetch comment count error:", err);
    res.status(500).json({ error: "Failed to fetch comment count" });
  }
};

/** POST /:id/comments — Add a new comment to a plan. Validates text is non-empty and ≤500 chars. */
export const addComment = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return;
    const { uid, userName, userPhoto } = req as AuthenticatedRequest;
    const { text } = req.body as { text: string };

    // Input validation — text must be a non-empty string under 500 characters
    if (!text?.trim()) {
      res.status(400).json({ error: "Comment text is required" });
      return;
    }
    if (typeof text !== "string" || text.trim().length > 500) {
      res.status(400).json({ error: "Comment text must be under 500 characters" });
      return;
    }

    const comment = await InteractionService.addComment(
      planId, uid!, userName ?? "Anonymous", userPhoto ?? null, text,
    );
    res.status(201).json(comment);
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

/** DELETE /:id/comments/:commentId — Delete a comment. Only the author can delete their own comment. */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const planId = validatePlanId(req.params.id, res);
    if (!planId) return;
    const userId = (req as AuthenticatedRequest).uid!;
    const result = await InteractionService.deleteComment(planId, req.params.commentId as string, userId);

    if (!result.deleted) {
      res.status(result.status!).json({ error: result.error });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
