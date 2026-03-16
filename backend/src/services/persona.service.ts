import * as PersonaModel from "../models/persona.model.js";
import { isValidSegment } from "../lib/persona-scoring.js";
import { getSegmentStats } from "../lib/segment-stats.js";
import type { PersonaProfile, PersonaSignals, PersonaSegment, SegmentStats } from "../types.js";

const EMPTY_SIGNALS: PersonaSignals = {
  categoriesViewed: {},
  priceRangeClicks: { low: 0, mid: 0, high: 0 },
  filtersUsed: {},
  planTypesViewed: {},
  totalPlanViews: 0,
  compareCount: 0,
};

/** Additively merge `source` signals into a copy of `base` and return the result. */
function mergeSignals(base: PersonaSignals, source: Partial<PersonaSignals>): PersonaSignals {
  const merged: PersonaSignals = {
    categoriesViewed: { ...base.categoriesViewed },
    priceRangeClicks: { ...base.priceRangeClicks },
    filtersUsed: { ...base.filtersUsed },
    planTypesViewed: { ...base.planTypesViewed },
    totalPlanViews: base.totalPlanViews,
    compareCount: base.compareCount,
  };
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

export async function getPersona(uid: string): Promise<PersonaProfile | null> {
  const doc = await PersonaModel.getUserDoc(uid);
  return doc?.persona ?? null;
}

export async function clearPersona(uid: string): Promise<void> {
  await PersonaModel.clearPersona(uid);
}

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

  const doc = await PersonaModel.getUserDoc(uid);
  const pendingSignals = doc?.pendingSignals;

  const baseSignals = persona.signals || EMPTY_SIGNALS;
  const finalSignals = pendingSignals
    ? mergeSignals(baseSignals, pendingSignals)
    : baseSignals;

  const profile: PersonaProfile = {
    segment: persona.segment,
    confidence: persona.confidence,
    ...(persona.quizAnswers !== undefined && { quizAnswers: persona.quizAnswers }),
    signals: finalSignals,
    updatedAt: Date.now(),
    createdAt: persona.createdAt || Date.now(),
  };

  await PersonaModel.savePersona(uid, profile, !!pendingSignals);
  await PersonaModel.saveUserSegment(uid, profile.segment);

  return { persona: profile };
}

export async function mergeUserSignals(
  uid: string,
  signals: Partial<PersonaSignals>,
): Promise<void> {
  const doc = await PersonaModel.getUserDoc(uid);
  const current = doc?.persona;

  const baseSignals = current?.signals ?? EMPTY_SIGNALS;
  const merged = mergeSignals(baseSignals, signals);

  if (current) {
    await PersonaModel.updatePersonaSignals(uid, merged);
  } else {
    await PersonaModel.savePendingSignals(uid, merged);
  }
}

export async function getSegmentStatsForSegment(segment: string): Promise<SegmentStats | null> {
  if (!isValidSegment(segment)) return null;
  return getSegmentStats(segment as PersonaSegment);
}
