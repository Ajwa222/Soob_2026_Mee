/**
 * Plan service — business logic for serving plan data.
 *
 * Key design decisions:
 *  - Plans are stored in-memory (PLANS_DATA array), not in Firestore, because they
 *    change rarely and the full dataset is small (~154 plans).
 *  - JSON responses are pre-serialized at startup to avoid repeated JSON.stringify()
 *    on every request. This means we use res.send() instead of res.json() in controllers.
 *  - Personalized results are cached per segment with a 5-minute TTL.
 */

import { PLANS_DATA } from "../data/plans.js";
import { getPersonalizedScore, isValidSegment } from "../lib/persona-scoring.js";
import type { Plan, PersonaSegment } from "../types.js";

// ── Pre-serialized JSON (computed once at server startup) ──

// Full plan data as a JSON string — returned by GET /api/plans
const PLANS_JSON = JSON.stringify(PLANS_DATA);

// Map for O(1) plan lookup by ID — used by getPlanById
const PLAN_MAP = new Map(PLANS_DATA.map((p) => [p.id, p]));

// Slim payload for card rendering — same fields, but pre-serialized for fast responses
const PLANS_CARDS_JSON = JSON.stringify(
  PLANS_DATA.map(({ id, provider, planName, planType, priceSAR, dataGB, socialMediaData, localCallMinutes, internationalCallMinutes, sms, roamingDataGB, contractTerms, specialFeatures, url }) => ({
    id, provider, planName, planType, priceSAR, dataGB, socialMediaData, localCallMinutes, internationalCallMinutes, sms, roamingDataGB, contractTerms, specialFeatures, url,
  }))
);

// ── Personalized plan cache ──
// Stores pre-serialized JSON of the top 20 plans per segment, refreshed every 5 minutes.
// Since there are only 8 segments, this cache holds at most 8 entries.
const personalizedCache = new Map<string, { data: string; expires: number }>();
const PERSONALIZED_TTL = 5 * 60_000; // 5 minutes

/** Returns pre-serialized JSON of all plans */
export function getAllPlansJson(): string {
  return PLANS_JSON;
}

/** Returns pre-serialized JSON of all plans (slim card format) */
export function getPlansCardsJson(): string {
  return PLANS_CARDS_JSON;
}

/** Looks up a single plan by numeric ID. Returns undefined if not found. */
export function getPlanById(id: number): Plan | undefined {
  return PLAN_MAP.get(id);
}

/**
 * Returns the top 20 plans for a persona segment, ranked by personalized score.
 * Results are cached per segment for 5 minutes to avoid re-scoring on every request.
 * Returns null if the segment is invalid.
 */
export function getPersonalizedPlans(segment: string): string | null {
  if (!isValidSegment(segment)) return null;

  // Return cached result if still fresh
  const cached = personalizedCache.get(segment);
  if (cached && Date.now() < cached.expires) return cached.data;

  // Score all plans against the segment weights, sort by score (highest first), take top 20
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
  return json;
}

/** Set of all valid plan IDs — used by validatePlanId() to check if an ID exists */
export const validPlanIds = new Set(PLANS_DATA.map((p) => p.id));
