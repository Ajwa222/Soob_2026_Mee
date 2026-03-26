/**
 * Persona service — manages user persona profiles and behavioral signal merging.
 *
 * The persona system works in two phases:
 *  1. **Before persona is created**: Behavioral signals from browsing are stored as
 *     "pending signals" in the user's Firestore doc.
 *  2. **When persona is saved** (after quiz): Pending signals are merged into the
 *     persona profile and cleared.
 *
 * Signals are additive — each merge adds counts to existing values rather than replacing them.
 * This means the persona becomes more accurate over time as more signals accumulate.
 */

import * as PersonaModel from "../models/persona.model.js";
import { isValidSegment } from "../lib/persona-scoring.js";
import { getSegmentStats } from "../lib/segment-stats.js";
import type { PersonaProfile, PersonaSignals, PersonaSegment, SegmentStats } from "../types.js";

/** Default empty signals — used as the base when no signals exist yet */
const EMPTY_SIGNALS: PersonaSignals = {
  categoriesViewed: {},
  priceRangeClicks: { low: 0, mid: 0, high: 0 },
  filtersUsed: {},
  planTypesViewed: {},
  totalPlanViews: 0,
  compareCount: 0,
};

/**
 * Additively merges `source` signals into a copy of `base`.
 * All numeric values are summed (not replaced), so signals accumulate over time.
 * Returns a new object — does not mutate either input.
 */
function mergeSignals(base: PersonaSignals, source: Partial<PersonaSignals>): PersonaSignals {
  const merged: PersonaSignals = {
    categoriesViewed: { ...base.categoriesViewed },
    priceRangeClicks: { ...base.priceRangeClicks },
    filtersUsed: { ...base.filtersUsed },
    planTypesViewed: { ...base.planTypesViewed },
    totalPlanViews: base.totalPlanViews,
    compareCount: base.compareCount,
  };
  // Merge each Record<string, number> field by summing values per key
  if (source.categoriesViewed) {
    for (const [k, v] of Object.entries(source.categoriesViewed)) {
      merged.categoriesViewed[k] = (merged.categoriesViewed[k] || 0) + v;
    }
  }
  if (source.priceRangeClicks) {
    merged.priceRangeClicks.low += source.priceRangeClicks.low || 0;
    merged.priceRangeClicks.mid += source.priceRangeClicks.mid || 0;
    merged.priceRangeClicks.high += source.priceRangeClicks.high || 0;
  }
  if (source.filtersUsed) {
    for (const [k, v] of Object.entries(source.filtersUsed)) {
      merged.filtersUsed[k] = (merged.filtersUsed[k] || 0) + v;
    }
  }
  if (source.planTypesViewed) {
    for (const [k, v] of Object.entries(source.planTypesViewed)) {
      merged.planTypesViewed[k] = (merged.planTypesViewed[k] || 0) + v;
    }
  }
  merged.totalPlanViews += source.totalPlanViews || 0;
  merged.compareCount += source.compareCount || 0;
  return merged;
}

/** Fetch the user's persona profile, or null if they haven't created one yet */
export async function getPersona(uid: string): Promise<PersonaProfile | null> {
  const doc = await PersonaModel.getUserDoc(uid);
  return doc?.persona ?? null;
}

/** Clear the user's persona entirely — removes persona, pending signals, and segment stats */
export async function clearPersona(uid: string): Promise<void> {
  await PersonaModel.clearPersona(uid);
}

/**
 * Save or update a user's persona profile.
 * - Validates the segment and confidence values
 * - Merges any pending signals (collected before persona was created) into the profile
 * - Updates the userSegments collection for segment stats tracking
 */
export async function savePersona(
  uid: string,
  persona: PersonaProfile,
): Promise<{ persona: PersonaProfile; error?: string; status?: number }> {
  if (!persona || !isValidSegment(persona.segment)) {
    return { persona: null!, error: "Invalid persona data", status: 400 };
  }

  if (typeof persona.confidence !== "number" || persona.confidence < 0 || persona.confidence > 1) {
    return { persona: null!, error: "Confidence must be 0-1", status: 400 };
  }

  // Check if there are pending signals to merge (collected before persona existed)
  const doc = await PersonaModel.getUserDoc(uid);
  const pendingSignals = doc?.pendingSignals;

  const baseSignals = persona.signals || EMPTY_SIGNALS;
  // If pending signals exist, merge them into the persona's signals
  const finalSignals = pendingSignals
    ? mergeSignals(baseSignals, pendingSignals)
    : baseSignals;

  const profile: PersonaProfile = {
    segment: persona.segment,
    confidence: persona.confidence,
    // ...(persona.quizAnswers !== undefined && { quizAnswers: persona.quizAnswers }),
    signals: finalSignals,
    updatedAt: Date.now(),
    createdAt: persona.createdAt || Date.now(),
  };

  // Save persona and clear pending signals (if any were merged)
  await PersonaModel.savePersona(uid, profile, !!pendingSignals);
  // Track this user in the segment stats collection
  await PersonaModel.saveUserSegment(uid, profile.segment);

  return { persona: profile };
}

/**
 * Merge behavioral signals from the frontend into the user's data.
 * - If the user already has a persona → merge directly into persona.signals
 * - If no persona yet → store as "pending signals" (merged later when persona is created)
 */
export async function mergeUserSignals(
  uid: string,
  signals: Partial<PersonaSignals>,
): Promise<void> {
  const doc = await PersonaModel.getUserDoc(uid);
  const current = doc?.persona;

  const baseSignals = current?.signals ?? EMPTY_SIGNALS;
  const merged = mergeSignals(baseSignals, signals);

  if (current) {
    // User has a persona — update signals directly
    await PersonaModel.updatePersonaSignals(uid, merged);
  } else {
    // No persona yet — save as pending (will be merged when persona is created)
    await PersonaModel.savePendingSignals(uid, merged);
  }
}

/** Get aggregated segment stats (top plans, like rates). Returns null if segment is invalid. */
export async function getSegmentStatsForSegment(segment: string): Promise<SegmentStats | null> {
  if (!isValidSegment(segment)) return null;
  return getSegmentStats(segment as PersonaSegment);
}
