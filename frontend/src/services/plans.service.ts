/**
 * Plans service — fetches plan catalog and engagement data from the backend.
 *
 * Both endpoints are public (no auth required) and use publicFetch for performance.
 *
 * Fallback: if the backend isn't reachable (e.g. design-only Netlify deploy
 * without VITE_API_URL set), getPlansCards falls back to a bundled static
 * catalog so plan browsing and bookmarks still work.
 */
import { publicFetch } from "./apiClient";
import type { Plan } from "../types";
import type { PlanEngagement } from "../context/PlansContext";
import { STATIC_PLANS } from "../data/plans-static";

/** GET /api/plans/cards — lightweight plan data for card rendering (no full details). */
export const getPlansCards = async (): Promise<Plan[]> => {
  try {
    return await publicFetch<Plan[]>("/api/plans/cards");
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Backend unreachable, using bundled plan catalog:', err);
    return STATIC_PLANS;
  }
};

/** GET /api/plan-interactions/engagement — batch fetch likes, dislikes, comment counts for all plans. */
export const getEngagement = async (): Promise<Record<string, PlanEngagement>> => {
  try {
    return await publicFetch<Record<string, PlanEngagement>>("/api/plan-interactions/engagement");
  } catch {
    return {}; // No engagement counts when backend is offline.
  }
};
