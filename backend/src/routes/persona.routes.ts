/**
 * Persona routes — user profiling and personalized recommendations.
 *
 * Users are classified into segments (gamer, student, family, etc.) based on
 * quiz answers and behavioral signals. These segments drive personalized plan
 * scoring and AI advisor tone.
 *
 * Mounted at: /api/persona
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { cacheJson } from "../middleware/cache.js";
import * as PersonaController from "../controllers/persona.controller.js";

const router = Router();

// ── Public routes ──

// GET /segment-stats/:segment — Aggregated stats for a segment (top plans, like rates)
// Used to show "popular with gamers" type recommendations
router.get("/segment-stats/:segment", cacheJson(), PersonaController.getSegmentStats);

// ── Authorized routes ──

// GET / — Fetch the current user's persona profile
router.get("/", requireAuth, PersonaController.getPersona);

// PUT / — Save/update the user's persona (after quiz or segment change)
router.put("/", requireAuth, PersonaController.savePersona);

// DELETE / — Clear the user's persona (reset to no segment)
router.delete("/", requireAuth, PersonaController.deletePersona);

// POST /signals — Merge behavioral signals from the frontend into the user's persona
// Signals include: categories viewed, price range clicks, filter usage, etc.
router.post("/signals", requireAuth, PersonaController.mergeSignals);

export default router;
