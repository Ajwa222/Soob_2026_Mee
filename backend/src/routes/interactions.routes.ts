/**
 * Interaction routes — likes, dislikes, and comments on plans.
 * Data is stored in Firestore (planReactions + planComments collections).
 *
 * Public routes: anyone can read engagement data and comments.
 * Authorized routes: require Firebase Auth to like/dislike/comment/delete.
 *
 * Mounted at: /api/plan-interactions
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { cacheJson } from "../middleware/cache.js";
import * as InteractionsController from "../controllers/interactions.controller.js";

const router = Router();

// ── Public routes (no auth required) ──

// GET /engagement — Batch fetch all plans' like/dislike/comment counts (cached 60s)
// Used by the frontend to show engagement badges on plan cards
router.get("/engagement", cacheJson(60), InteractionsController.getEngagement);

// GET /:id/reactions — Get like/dislike counts and user lists for a single plan
router.get("/:id/reactions", InteractionsController.getReaction);

// GET /:id/comments — Get all comments for a plan (newest first)
router.get("/:id/comments", InteractionsController.getComments);

// GET /:id/comments/count — Get just the comment count for a plan
router.get("/:id/comments/count", InteractionsController.getCommentCount);

// ── Authorized routes (require logged-in user) ──

// POST /:id/reactions/like — Toggle like on a plan (like ↔ unlike)
router.post("/:id/reactions/like", requireAuth, InteractionsController.toggleLike);

// POST /:id/reactions/dislike — Toggle dislike on a plan (dislike ↔ undislike)
router.post("/:id/reactions/dislike", requireAuth, InteractionsController.toggleDislike);

// POST /:id/comments — Add a comment to a plan (max 500 chars)
router.post("/:id/comments", requireAuth, InteractionsController.addComment);

// DELETE /:id/comments/:commentId — Delete a comment (author only)
router.delete("/:id/comments/:commentId", requireAuth, InteractionsController.deleteComment);

export default router;
