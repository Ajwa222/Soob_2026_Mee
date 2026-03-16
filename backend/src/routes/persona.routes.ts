import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { cacheJson } from "../middleware/cache.js";
import * as PersonaController from "../controllers/persona.controller.js";

const router = Router();

// Public routes
router.get("/segment-stats/:segment", cacheJson(), PersonaController.getSegmentStats);

// Authorized routes
router.get("/", requireAuth, PersonaController.getPersona);
router.put("/", requireAuth, PersonaController.savePersona);
router.delete("/", requireAuth, PersonaController.deletePersona);
router.post("/signals", requireAuth, PersonaController.mergeSignals);

export default router;
