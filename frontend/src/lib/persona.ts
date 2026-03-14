import type { PersonaSegment, PersonaSignals, SegmentWeights } from '@/types';

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

const SEGMENT_LABELS: Record<PersonaSegment, { en: string; ar: string }> = {
  gamer:      { en: 'Gamer',        ar: 'قيمر' },
  student:    { en: 'Student',      ar: 'طالب' },
  family:     { en: 'Family',       ar: 'عائلة' },
  business:   { en: 'Business',     ar: 'أعمال' },
  expat:      { en: 'Expat',        ar: 'مقيم' },
  budget:     { en: 'Budget',       ar: 'اقتصادي' },
  streamer:   { en: 'Streamer',     ar: 'ستريمر' },
  power_user: { en: 'Power User',   ar: 'مستخدم متقدم' },
};

export function getSegmentLabel(segment: PersonaSegment, lang: 'en' | 'ar'): string {
  return SEGMENT_LABELS[segment]?.[lang] ?? segment;
}

export function createEmptySignals(): PersonaSignals {
  return {
    categoriesViewed: {},
    priceRangeClicks: { low: 0, mid: 0, high: 0 },
    filtersUsed: {},
    planTypesViewed: {},
    totalPlanViews: 0,
    compareCount: 0,
  };
}

/** Infer segment from implicit behavior signals */
export function inferSegmentFromSignals(signals: PersonaSignals): { segment: PersonaSegment; confidence: number } {
  const scores: Record<PersonaSegment, number> = {
    gamer: 0, student: 0, family: 0, business: 0,
    expat: 0, budget: 0, streamer: 0, power_user: 0,
  };

  // Category views (strongest implicit signal)
  const cv = signals.categoriesViewed;
  if ((cv.gamers || 0) > 2) scores.gamer += (cv.gamers || 0) * 2;
  if ((cv.students || 0) > 2) scores.student += (cv.students || 0) * 2;
  if ((cv.expats || 0) > 2) scores.expat += (cv.expats || 0) * 2;
  if ((cv.budget || 0) > 2) scores.budget += (cv.budget || 0) * 2;
  if ((cv.unlimited || 0) > 2) { scores.power_user += (cv.unlimited || 0); scores.streamer += (cv.unlimited || 0); }
  if ((cv['local-calls'] || 0) > 2) scores.family += (cv['local-calls'] || 0) * 1.5;
  if ((cv['data-only'] || 0) > 2) { scores.streamer += (cv['data-only'] || 0); scores.gamer += (cv['data-only'] || 0); }
  if ((cv.balanced || 0) > 2) scores.family += (cv.balanced || 0);

  // Price range clicks
  const pr = signals.priceRangeClicks;
  if (pr.low > pr.high * 2) scores.budget += 8;
  if (pr.high > pr.low * 2) { scores.power_user += 5; scores.business += 3; }

  // Filter usage
  const fu = signals.filtersUsed;
  if ((fu['5g'] || 0) > 2) { scores.gamer += 5; scores.power_user += 3; }
  if ((fu.unlimited || 0) > 2) { scores.streamer += 5; scores.power_user += 4; }
  if ((fu.international || 0) > 2) { scores.expat += 6; scores.business += 3; }
  if ((fu.social || 0) > 2) { scores.student += 4; scores.streamer += 3; }

  // Find top segment
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;
  const confidence = total > 5 ? Math.min(top[1] / total, 1) : 0;

  return {
    segment: top[0] as PersonaSegment,
    confidence,
  };
}

/** Infer segment from advisor chat quiz answers */
export function inferSegmentFromAdvisorChat(
  answers: { internet: string; calls: string; social: string; budget: number },
): { segment: PersonaSegment; confidence: number } {
  const scores: Record<PersonaSegment, number> = {
    gamer: 0, student: 0, family: 0, business: 0,
    expat: 0, budget: 0, streamer: 0, power_user: 0,
  };

  // Internet needs
  if (answers.internet === 'Yes') {
    scores.gamer += 3; scores.streamer += 3; scores.power_user += 2;
  } else if (answers.internet === 'No') {
    scores.budget += 4; scores.family += 2;
  }

  // Call type
  switch (answers.calls) {
    case 'Local calls':         scores.family += 5; scores.business += 2; break;
    case 'International calls': scores.expat += 8; scores.business += 4; break;
    case 'Both':                scores.business += 5; scores.expat += 4; scores.family += 2; break;
    case 'No':                  scores.gamer += 3; scores.student += 3; scores.streamer += 2; break;
  }

  // Social media
  if (answers.social === 'Yes, a must!') {
    scores.student += 6; scores.streamer += 6;
  } else if (answers.social === 'Nice to have') {
    scores.student += 2; scores.streamer += 2;
  } else if (answers.social === 'No') {
    scores.business += 2; scores.budget += 1;
  }

  // Budget (SAR)
  if (answers.budget <= 85) {
    scores.budget += 8; scores.student += 5;
  } else if (answers.budget <= 200) {
    scores.student += 3; scores.family += 3;
  } else if (answers.budget <= 400) {
    scores.business += 4; scores.power_user += 3; scores.family += 2;
  } else {
    scores.power_user += 6; scores.business += 3;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;

  return {
    segment: top[0] as PersonaSegment,
    confidence: Math.min(top[1] / total, 0.85), // cap slightly lower than explicit quiz
  };
}

/** Client-side personalized plan scoring (mirrors backend) */
export function getPersonalizedScore(
  plan: { dataGB: string; localCallMinutes: string; internationalCallMinutes: string; socialMediaData: string; priceSAR: number; specialFeatures: string; roamingDataGB: string },
  segment: PersonaSegment,
): number {
  const w = SEGMENT_WEIGHTS[segment];
  let score = 0;

  const dataVal = plan.dataGB === 'Unlimited' ? 200 : Math.min(parseFloat(plan.dataGB) || 0, 200);
  score += (dataVal / 200) * w.data;

  const callVal = plan.localCallMinutes === 'Unlimited' ? 100 : Math.min((parseFloat(plan.localCallMinutes) || 0) / 30, 100);
  score += (callVal / 100) * w.calls;

  const intlVal = parseFloat(plan.internationalCallMinutes) || 0;
  score += Math.min(intlVal / 200, 1) * w.international;

  const socialVal = plan.socialMediaData === 'Unlimited' ? 1 : Math.min((parseFloat(plan.socialMediaData) || 0) / 100, 1);
  score += socialVal * w.social;

  score += Math.max(0, 1 - plan.priceSAR / 500) * w.price;

  const features = (plan.specialFeatures || '').toLowerCase();
  if (features.includes('5g')) score += w.fiveG;

  const roamVal = parseFloat(plan.roamingDataGB) || 0;
  if (roamVal > 0 || features.includes('roaming')) score += w.roaming;

  if (plan.dataGB === 'Unlimited') score += w.unlimited * 0.5;
  if (plan.localCallMinutes === 'Unlimited') score += w.unlimited * 0.3;

  return score;
}
