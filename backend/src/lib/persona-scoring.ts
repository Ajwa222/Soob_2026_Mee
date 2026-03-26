/**
 * Persona scoring — ranks plans based on user segment preferences.
 *
 * Each segment has a weight vector (0-10) for different plan attributes.
 * Plans are scored by normalizing their attributes to 0-1 and multiplying by the weights.
 *
 * Example: A "gamer" segment has data=10, fiveG=10, unlimited=8 — so plans with
 * high data, 5G, and unlimited features score highest for gamers.
 *
 * The scoring is intentionally simple (weighted sum, no ML) for transparency and speed.
 */

import type { Plan, PersonaSegment, SegmentWeights } from "../types.js";

/**
 * Weight vectors for each segment. Values range 0-10 where 10 = most important.
 * These weights define what each user type cares about most in a plan.
 */
export const SEGMENT_WEIGHTS: Record<PersonaSegment, SegmentWeights> = {
  gamer:      { data: 10, calls: 1, international: 0, social: 3, price: 2, fiveG: 10, roaming: 0, unlimited: 8 },
  student:    { data: 6,  calls: 3, international: 1, social: 8, price: 9, fiveG: 2,  roaming: 0, unlimited: 3 },
  family:     { data: 7,  calls: 8, international: 2, social: 5, price: 6, fiveG: 2,  roaming: 1, unlimited: 5 },
  business:   { data: 7,  calls: 9, international: 7, social: 2, price: 3, fiveG: 5,  roaming: 6, unlimited: 6 },
  expat:      { data: 5,  calls: 6, international: 10, social: 3, price: 5, fiveG: 2, roaming: 10, unlimited: 3 },
  budget:     { data: 4,  calls: 4, international: 1, social: 3, price: 10, fiveG: 1, roaming: 0, unlimited: 1 },
  streamer:   { data: 10, calls: 2, international: 0, social: 10, price: 4, fiveG: 6, roaming: 0, unlimited: 9 },
  power_user: { data: 10, calls: 7, international: 4, social: 5, price: 2, fiveG: 8, roaming: 5, unlimited: 10 },
};

const VALID_SEGMENTS = new Set<string>(Object.keys(SEGMENT_WEIGHTS));

/** Type guard: checks if a value is a valid PersonaSegment string */
export function isValidSegment(s: unknown): s is PersonaSegment {
  return typeof s === "string" && VALID_SEGMENTS.has(s);
}

/**
 * Computes a personalized relevance score for a plan based on a segment's weight vector.
 *
 * Scoring approach:
 *  - Each attribute is normalized to a 0-1 range
 *  - Multiplied by the segment's weight for that attribute (0-10)
 *  - All weighted scores are summed to produce a final score
 *  - Price uses inverse scoring (cheaper = higher score)
 *  - 5G, roaming, and unlimited are bonus points (binary or partial)
 */
export function getPersonalizedScore(plan: Plan, segment: PersonaSegment): number {
  const w = SEGMENT_WEIGHTS[segment];
  let score = 0;

  // Data: normalize to 0-1 range (cap at 200GB, "Unlimited" = max)
  const dataVal = plan.dataGB === "Unlimited" ? 200 : Math.min(parseFloat(plan.dataGB) || 0, 200);
  score += (dataVal / 200) * w.data;

  // Local calls: normalize minutes to 0-1 range (cap at 3000 min, "Unlimited" = max)
  const callVal = plan.localCallMinutes === "Unlimited" ? 100 : Math.min((parseFloat(plan.localCallMinutes) || 0) / 30, 100);
  score += (callVal / 100) * w.calls;

  // International calls: normalize to 0-1 range (cap at 200 min)
  const intlVal = parseFloat(plan.internationalCallMinutes) || 0;
  score += Math.min(intlVal / 200, 1) * w.international;

  // Social media data: normalize to 0-1 ("Unlimited" = 1, cap at 100GB)
  const socialVal = plan.socialMediaData === "Unlimited" ? 1 : Math.min((parseFloat(plan.socialMediaData) || 0) / 100, 1);
  score += socialVal * w.social;

  // Price: INVERSE scoring — cheaper plans get higher scores. Normalized against 500 SAR ceiling.
  score += Math.max(0, 1 - plan.priceSAR / 500) * w.price;

  // 5G bonus: full weight if plan mentions 5G in features
  const features = (plan.specialFeatures || "").toLowerCase();
  if (features.includes("5g")) score += w.fiveG;

  // Roaming bonus: full weight if plan has roaming data or mentions roaming
  const roamVal = parseFloat(plan.roamingDataGB) || 0;
  if (roamVal > 0 || features.includes("roaming")) score += w.roaming;

  // Unlimited bonuses: partial weight for unlimited data (50%) and unlimited calls (30%)
  if (plan.dataGB === "Unlimited") score += w.unlimited * 0.5;
  if (plan.localCallMinutes === "Unlimited") score += w.unlimited * 0.3;

  return score;
}
