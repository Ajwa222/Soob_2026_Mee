import { Router } from "express";
import { PLANS_DATA } from "../data/plans.js";

const router = Router();

/** GET /api/plans — return all plans */
router.get("/", (_req, res) => {
  res.json(PLANS_DATA);
});

/** GET /api/plans/:id — return a single plan */
router.get("/:id", (req, res) => {
  const plan = PLANS_DATA.find((p) => p.id === Number(req.params.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(plan);
});

export default router;
