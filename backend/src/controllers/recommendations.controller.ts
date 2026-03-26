/**
 * Recommendations controller — serves personalized plan recommendations.
 *
 * GET /api/recommendations?limit=10
 *   - Anonymous users: global popularity (most liked plans)
 *   - Logged-in users with likes: collaborative filtering
 */

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import * as RecommendationService from "../services/recommendation.service.js";

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).uid;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
    const result = await RecommendationService.getRecommendations(uid, limit);
    res.json(result);
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
};
