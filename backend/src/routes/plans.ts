import { Router } from "express";
import { PLANS_DATA } from "../data/plans.js";
import { getPersonalizedScore, isValidSegment } from "../lib/persona-scoring.js";
import type { PersonaSegment } from "../types.js";

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

// Cache personalized results per segment (5 min TTL)
const personalizedCache = new Map<string, { data: string; expires: number }>();
const PERSONALIZED_TTL = 5 * 60_000;

/** GET /api/plans/personalized?segment=gamer — top 20 plans sorted by persona score */
router.get("/personalized", (req, res) => {
  const segment = req.query.segment as string;
  if (!isValidSegment(segment)) {
    res.status(400).json({ error: "Invalid or missing segment parameter" });
    return;
  }

  const cached = personalizedCache.get(segment);
  if (cached && Date.now() < cached.expires) {
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.set("Content-Type", "application/json");
    res.send(cached.data);
    return;
  }

  const scored = PLANS_DATA
    .map((plan) => ({ plan, score: getPersonalizedScore(plan, segment as PersonaSegment) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ plan }) => ({
      id: plan.id, provider: plan.provider, planName: plan.planName, planType: plan.planType,
      priceSAR: plan.priceSAR, dataGB: plan.dataGB, socialMediaData: plan.socialMediaData,
      localCallMinutes: plan.localCallMinutes, internationalCallMinutes: plan.internationalCallMinutes,
      sms: plan.sms, roamingDataGB: plan.roamingDataGB, contractTerms: plan.contractTerms,
      specialFeatures: plan.specialFeatures, url: plan.url,
    }));

  const json = JSON.stringify(scored);
  personalizedCache.set(segment, { data: json, expires: Date.now() + PERSONALIZED_TTL });

  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.set("Content-Type", "application/json");
  res.send(json);
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
