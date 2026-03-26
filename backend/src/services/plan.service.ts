/**
 * Plan service — business logic for serving plan data.
 *
 * Key design decisions:
 *  - Plans are stored in-memory (PLANS_DATA array), not in Firestore, because they
 *    change rarely and the full dataset is small (~154 plans).
 *  - JSON responses are pre-serialized at startup to avoid repeated JSON.stringify()
 *    on every request. This means we use res.send() instead of res.json() in controllers.
 */

import { PLANS_DATA } from "../data/plans.js";
import type { Plan } from "../types.js";

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

/** Set of all valid plan IDs — used by validatePlanId() to check if an ID exists */
export const validPlanIds = new Set(PLANS_DATA.map((p) => p.id));
