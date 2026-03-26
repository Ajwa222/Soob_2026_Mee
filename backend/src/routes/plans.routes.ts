/**
 * Plan routes — serves telecom plan data from in-memory storage.
 * All list endpoints are cached (5 min default) since plan data rarely changes.
 *
 * Mounted at: /api/plans
 */

import { Router } from "express";
import * as PlansController from "../controllers/plans.controller.js";
import { cacheJson } from "../middleware/cache.js";

const router = Router();

// GET /api/plans/cards — Slim plan payload for card rendering (lighter than full data)
router.get("/cards", cacheJson(), PlansController.getCards);

// GET /api/plans — Full plan data (all 154 plans with all fields)
router.get("/", cacheJson(), PlansController.getAll);

// GET /api/plans/:id — Single plan by ID (no cache — individual lookups are fast)
router.get("/:id", PlansController.getById);

export default router;
