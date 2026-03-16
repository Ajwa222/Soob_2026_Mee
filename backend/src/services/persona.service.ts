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

function mergePendingSignals(base: PersonaSignals, pending: PersonaSignals): PersonaSignals {
  const merged: PersonaSignals = {
    categoriesViewed: { ...base.categoriesViewed },
    priceRangeClicks: { ...base.priceRangeClicks },
    filtersUsed: { ...base.filtersUsed },
    planTypesViewed: { ...base.planTypesViewed },
    totalPlanViews: base.totalPlanViews,
    compareCount: base.compareCount,
  };
  for (const [k, v] of Object.entries(pending.categoriesViewed)) {
    merged.categoriesViewed[k] = (merged.categoriesViewed[k] || 0) + v;
  }
  merged.priceRangeClicks.low += pending.priceRangeClicks.low;
  merged.priceRangeClicks.mid += pending.priceRangeClicks.mid;
  merged.priceRangeClicks.high += pending.priceRangeClicks.high;
  for (const [k, v] of Object.entries(pending.filtersUsed)) {
    merged.filtersUsed[k] = (merged.filtersUsed[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pending.planTypesViewed)) {
    merged.planTypesViewed[k] = (merged.planTypesViewed[k] || 0) + v;
  }
  merged.totalPlanViews += pending.totalPlanViews;
  merged.compareCount += pending.compareCount;
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
    ? mergePendingSignals(baseSignals, pendingSignals)
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

export async function mergeSignals(
  uid: string,
  signals: Partial<PersonaSignals>,
): Promise<void> {
  const doc = await PersonaModel.getUserDoc(uid);
  const current = doc?.persona;

  const baseSignals = current?.signals ?? EMPTY_SIGNALS;
  const merged: PersonaSignals = { ...baseSignals };

  if (signals.categoriesViewed) {
    for (const [k, v] of Object.entries(signals.categoriesViewed)) {
      merged.categoriesViewed[k] = (merged.categoriesViewed[k] || 0) + v;
    }
  }
  if (signals.priceRangeClicks) {
    merged.priceRangeClicks.low += signals.priceRangeClicks.low || 0;
    merged.priceRangeClicks.mid += signals.priceRangeClicks.mid || 0;
    merged.priceRangeClicks.high += signals.priceRangeClicks.high || 0;
  }
  if (signals.filtersUsed) {
    for (const [k, v] of Object.entries(signals.filtersUsed)) {
      merged.filtersUsed[k] = (merged.filtersUsed[k] || 0) + v;
    }
  }
  if (signals.planTypesViewed) {
    for (const [k, v] of Object.entries(signals.planTypesViewed)) {
      merged.planTypesViewed[k] = (merged.planTypesViewed[k] || 0) + v;
    }
  }
  merged.totalPlanViews += signals.totalPlanViews || 0;
  merged.compareCount += signals.compareCount || 0;

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
