import { PLANS_DATA } from "../data/plans.js";
import { getPersonalizedScore, isValidSegment } from "../lib/persona-scoring.js";
import type { Plan, PersonaSegment } from "../types.js";

// Pre-serialize JSON at startup
const PLANS_JSON = JSON.stringify(PLANS_DATA);
const PLAN_MAP = new Map(PLANS_DATA.map((p) => [p.id, p]));

// Slim payload for card rendering
const PLANS_CARDS_JSON = JSON.stringify(
  PLANS_DATA.map(({ id, provider, planName, planType, priceSAR, dataGB, socialMediaData, localCallMinutes, internationalCallMinutes, sms, roamingDataGB, contractTerms, specialFeatures, url }) => ({
    id, provider, planName, planType, priceSAR, dataGB, socialMediaData, localCallMinutes, internationalCallMinutes, sms, roamingDataGB, contractTerms, specialFeatures, url,
  }))
);

// Cache personalized results per segment (5 min TTL)
const personalizedCache = new Map<string, { data: string; expires: number }>();
const PERSONALIZED_TTL = 5 * 60_000;

export function getAllPlansJson(): string {
  return PLANS_JSON;
}

export function getPlansCardsJson(): string {
  return PLANS_CARDS_JSON;
}

export function getPlanById(id: number): Plan | undefined {
  return PLAN_MAP.get(id);
}

export function getPersonalizedPlans(segment: string): string | null {
  if (!isValidSegment(segment)) return null;

  const cached = personalizedCache.get(segment);
  if (cached && Date.now() < cached.expires) return cached.data;

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

/** Set of valid plan IDs for validation */
export const validPlanIds = new Set(PLANS_DATA.map((p) => p.id));
