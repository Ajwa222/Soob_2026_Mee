/**
 * Recommendations routes — personalized plan suggestions.
 *
 * Uses optionalAuth so both anonymous and logged-in users get results:
 *  - Anonymous → global popularity
 *  - Logged-in with likes → collaborative filtering
 *
 * Mounted at: /api/recommendations
 */

import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import * as RecommendationsController from "../controllers/recommendations.controller.js";

const router = Router();

// No HTTP caching — results are per-user (collaborative/content-based vary by auth)
router.get("/", optionalAuth, RecommendationsController.getRecommendations);

export default router;
