import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as InteractionsController from "../controllers/interactions.controller.js";

const router = Router();

// Public routes
router.get("/engagement", InteractionsController.getEngagement);
router.get("/:id/reactions", InteractionsController.getReaction);
router.get("/:id/comments", InteractionsController.getComments);
router.get("/:id/comments/count", InteractionsController.getCommentCount);

// Authorized routes
router.post("/:id/reactions/like", requireAuth, InteractionsController.toggleLike);
router.post("/:id/reactions/dislike", requireAuth, InteractionsController.toggleDislike);
router.post("/:id/comments", requireAuth, InteractionsController.addComment);
router.delete("/:id/comments/:commentId", requireAuth, InteractionsController.deleteComment);

export default router;
