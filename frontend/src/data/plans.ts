/**
 * Plan data utilities — carrier metadata, helper functions, and value scoring.
 *
 * This file provides:
 *  - CARRIERS: static list of all 8 Saudi carriers with brand color and logo path
 *  - getCarrierLogo/getCarrierColor: look up carrier branding by name
 *  - isValidValue: checks if a plan field has meaningful content (not empty/dash)
 *  - getValueScore: calculates a "bang for your buck" score for sorting/ranking plans
 *
 * Note: actual plan data comes from the backend (GET /api/plans/cards).
 * This file only contains carrier metadata and scoring logic.
 */
import type { Plan } from '../types';

// ── Carrier metadata (all 8 licensed Saudi telecom carriers) ──
export const CARRIERS = [
  { name: "STC", color: "#4F0D7F", logo: "/logos/stc.png" },
  { name: "Mobily", color: "#0099E5", logo: "/logos/mobily.png" },
  { name: "Zain", color: "#8DC63F", logo: "/logos/zain.png" },
  { name: "Virgin Mobile", color: "#E60000", logo: "/logos/virgin.png" },
  { name: "Jawwy", color: "#FF611F", logo: "/logos/jawwy.svg" },
  { name: "Lebara", color: "#00AEEF", logo: "/logos/lebara.png" },
  { name: "Yaqoot", color: "#B5304A", logo: "/logos/yaqoot.png" },
  { name: "Salam", color: "#00AD42", logo: "/logos/salam.svg" },
];

/** Returns the logo path for a carrier (e.g. "/logos/stc.png"), or null if not found. */
export const getCarrierLogo = (provider: string): string | null => {
  const carrier = CARRIERS.find(c => c.name === provider);
  return carrier?.logo || null;
};

/** Returns the brand color hex for a carrier, or a neutral gray fallback. */
export const getCarrierColor = (provider: string): string => {
  const carrier = CARRIERS.find(c => c.name === provider);
  return carrier?.color || "#78716C";
};

/** Returns true if a plan field has meaningful content (not null, empty, or just "-"). */
export const isValidValue = (val: string | null | undefined): boolean => {
  if (!val) return false;
  const v = val.toString().trim();
  return v !== "" && v !== "-";
};

/**
 * Value score: higher = better bang for your buck.
 * Weighs data heavily, then minutes, SMS, social, intl calls, features.
 * Divides total "benefit points" by price to get value-per-SAR.
 */
export const getValueScore = (plan: Plan): number => {
  const price = plan.priceSAR || 1;
  let points = 0;

  // Data (biggest weight — up to 200 pts for unlimited)
  if (plan.dataGB === 'Unlimited') points += 200;
  else { const gb = parseFloat(plan.dataGB) || 0; points += Math.min(gb * 3, 180); }

  // Local calls (up to 100 pts)
  if (plan.localCallMinutes === 'Unlimited') points += 100;
  else { const m = parseFloat(plan.localCallMinutes) || 0; points += Math.min(m * 0.15, 90); }

  // SMS (up to 30 pts)
  if (plan.sms === 'Unlimited') points += 30;
  else { const s = parseFloat(plan.sms) || 0; points += Math.min(s * 0.05, 25); }

  // Social media data (up to 50 pts)
  if (plan.socialMediaData && plan.socialMediaData !== '-' && plan.socialMediaData !== '' && plan.socialMediaData !== '1') {
    if (plan.socialMediaData === 'Unlimited' || plan.socialMediaData.toLowerCase().includes('unlimited')) points += 50;
    else { const sg = parseFloat(plan.socialMediaData) || 0; points += Math.min(sg * 2, 40); }
  }

  // International calls (up to 30 pts)
  if (plan.internationalCallMinutes && plan.internationalCallMinutes !== '-' && plan.internationalCallMinutes !== '') {
    const ic = parseFloat(plan.internationalCallMinutes) || 0;
    points += Math.min(ic * 0.3, 30);
  }

  // Special features bonus (10 pts if has features)
  if (plan.specialFeatures && plan.specialFeatures !== '-' && plan.specialFeatures !== '') {
    points += 10;
    if (plan.specialFeatures.toLowerCase().includes('5g')) points += 5;
    if (plan.specialFeatures.toLowerCase().includes('roaming')) points += 5;
  }

  return points / price;
};
