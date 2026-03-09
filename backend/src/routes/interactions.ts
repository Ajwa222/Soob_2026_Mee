import { Router } from "express";
import { db } from "../lib/firebase.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import type { PlanReaction, PlanComment } from "../types.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

const REACTIONS_COL = "planReactions";
const COMMENTS_COL = "planComments";

const defaultReaction: PlanReaction = {
  likes: 0,
  dislikes: 0,
  likedBy: [],
  dislikedBy: [],
};

/** GET /api/plans/:id/reactions */
router.get("/:id/reactions", async (req, res) => {
  try {
    const planId = req.params.id as string;
    const snap = await db.collection(REACTIONS_COL).doc(planId).get();
    if (!snap.exists) {
      res.json({ ...defaultReaction });
      return;
    }
    const data = snap.data()!;
    res.json({
      likes: Math.max(0, data.likes ?? 0),
      dislikes: Math.max(0, data.dislikes ?? 0),
      likedBy: data.likedBy ?? [],
      dislikedBy: data.dislikedBy ?? [],
    } as PlanReaction);
  } catch (err) {
    console.error("Fetch reaction error:", err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

/** POST /api/plans/:id/reactions/like */
router.post("/:id/reactions/like", requireAuth, async (req, res) => {
  try {
    const planId = req.params.id as string;
    const userId = (req as AuthenticatedRequest).uid!;
    const ref = db.collection(REACTIONS_COL).doc(planId);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        likes: 1,
        dislikes: 0,
        likedBy: [userId],
        dislikedBy: [],
      });
      res.json({ toggled: "liked" });
      return;
    }

    const data = snap.data()!;
    const alreadyLiked = (data.likedBy ?? []).includes(userId);
    const alreadyDisliked = (data.dislikedBy ?? []).includes(userId);

    const updates: Record<string, unknown> = {};

    if (alreadyLiked) {
      updates.likedBy = FieldValue.arrayRemove(userId);
      updates.likes = FieldValue.increment(-1);
    } else {
      updates.likedBy = FieldValue.arrayUnion(userId);
      updates.likes = FieldValue.increment(1);
      if (alreadyDisliked) {
        updates.dislikedBy = FieldValue.arrayRemove(userId);
        updates.dislikes = FieldValue.increment(-1);
      }
    }

    await ref.update(updates);
    res.json({ toggled: alreadyLiked ? "unliked" : "liked" });
  } catch (err) {
    console.error("Toggle like error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

/** POST /api/plans/:id/reactions/dislike */
router.post("/:id/reactions/dislike", requireAuth, async (req, res) => {
  try {
    const planId = req.params.id as string;
    const userId = (req as AuthenticatedRequest).uid!;
    const ref = db.collection(REACTIONS_COL).doc(planId);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        likes: 0,
        dislikes: 1,
        likedBy: [],
        dislikedBy: [userId],
      });
      res.json({ toggled: "disliked" });
      return;
    }

    const data = snap.data()!;
    const alreadyDisliked = (data.dislikedBy ?? []).includes(userId);
    const alreadyLiked = (data.likedBy ?? []).includes(userId);

    const updates: Record<string, unknown> = {};

    if (alreadyDisliked) {
      updates.dislikedBy = FieldValue.arrayRemove(userId);
      updates.dislikes = FieldValue.increment(-1);
    } else {
      updates.dislikedBy = FieldValue.arrayUnion(userId);
      updates.dislikes = FieldValue.increment(1);
      if (alreadyLiked) {
        updates.likedBy = FieldValue.arrayRemove(userId);
        updates.likes = FieldValue.increment(-1);
      }
    }

    await ref.update(updates);
    res.json({ toggled: alreadyDisliked ? "undisliked" : "disliked" });
  } catch (err) {
    console.error("Toggle dislike error:", err);
    res.status(500).json({ error: "Failed to toggle dislike" });
  }
});

/** GET /api/plans/:id/comments */
router.get("/:id/comments", async (req, res) => {
  try {
    const planId = req.params.id as string;
    const colRef = db
      .collection(COMMENTS_COL)
      .doc(planId)
      .collection("comments");
    const snap = await colRef.orderBy("createdAt", "desc").get();
    const comments: PlanComment[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as PlanComment[];
    res.json(comments);
  } catch (err) {
    console.error("Fetch comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

/** GET /api/plans/:id/comments/count */
router.get("/:id/comments/count", async (req, res) => {
  try {
    const planId = req.params.id as string;
    const colRef = db
      .collection(COMMENTS_COL)
      .doc(planId)
      .collection("comments");
    const snap = await colRef.get();
    res.json({ count: snap.size });
  } catch (err) {
    console.error("Fetch comment count error:", err);
    res.status(500).json({ error: "Failed to fetch comment count" });
  }
});

/** POST /api/plans/:id/comments */
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const planId = req.params.id as string;
    const { uid, userName, userPhoto } = req as AuthenticatedRequest;
    const { text } = req.body as { text: string };

    if (!text?.trim()) {
      res.status(400).json({ error: "Comment text is required" });
      return;
    }

    if (typeof text !== "string" || text.trim().length > 500) {
      res.status(400).json({ error: "Comment text must be under 500 characters" });
      return;
    }

    const commentData = {
      userId: uid!,
      userName: userName ?? "Anonymous",
      userPhoto: userPhoto ?? null,
      text: text.trim(),
      createdAt: Date.now(),
    };

    const colRef = db
      .collection(COMMENTS_COL)
      .doc(planId)
      .collection("comments");
    const docRef = await colRef.add(commentData);

    res.status(201).json({ id: docRef.id, ...commentData });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

/** DELETE /api/plans/:id/comments/:commentId */
router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const planId = req.params.id as string;
    const commentId = req.params.commentId as string;
    const userId = (req as AuthenticatedRequest).uid!;

    // Only allow the comment author to delete
    const docRef = db
      .collection(COMMENTS_COL)
      .doc(planId)
      .collection("comments")
      .doc(commentId);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    if (snap.data()!.userId !== userId) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }

    await docRef.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
