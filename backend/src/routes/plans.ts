import { Router } from "express";
import { PLANS_DATA } from "../data/plans.js";

const router = Router();

// Pre-serialize the plans JSON once at startup (avoid re-serializing on every request)
const PLANS_JSON = JSON.stringify(PLANS_DATA);
const PLAN_MAP = new Map(PLANS_DATA.map((p) => [p.id, p]));

/** GET /api/plans — return all plans */
router.get("/", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.set("Content-Type", "application/json");
  res.send(PLANS_JSON);
});

/** GET /api/plans/:id — return a single plan */
router.get("/:id", (req, res) => {
  const plan = PLAN_MAP.get(Number(req.params.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json(plan);
});

export default router;
