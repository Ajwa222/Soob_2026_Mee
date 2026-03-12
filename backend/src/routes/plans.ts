import { Router } from "express";
import { PLANS_DATA } from "../data/plans.js";

const router = Router();

// Pre-serialize JSON at startup
const PLANS_JSON = JSON.stringify(PLANS_DATA);
const PLAN_MAP = new Map(PLANS_DATA.map((p) => [p.id, p]));

// Slim payload for card rendering — drop url, roamingDataGB (heavy fields unused in cards)
const PLANS_CARDS_JSON = JSON.stringify(
  PLANS_DATA.map(({ id, provider, planName, planType, priceSAR, dataGB, socialMediaData, localCallMinutes, internationalCallMinutes, sms, roamingDataGB, contractTerms, specialFeatures, url }) => ({
    id, provider, planName, planType, priceSAR, dataGB, socialMediaData, localCallMinutes, internationalCallMinutes, sms, roamingDataGB, contractTerms, specialFeatures, url,
  }))
);

/** GET /api/plans/cards — lightweight payload for card rendering */
router.get("/cards", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.set("Content-Type", "application/json");
  res.send(PLANS_CARDS_JSON);
});

/** GET /api/plans — return all plans (full data) */
router.get("/", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.set("Content-Type", "application/json");
  res.send(PLANS_JSON);
});

/** GET /api/plans/:id — return a single plan (full data) */
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
