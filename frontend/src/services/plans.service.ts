/**
 * Plans service — fetches plan catalog and engagement data from the backend.
 *
 * Both endpoints are public (no auth required) and use publicFetch for performance.
 */
import { publicFetch } from "./apiClient";
import type { Plan } from "../types";
import type { PlanEngagement } from "../context/PlansContext";

/** GET /api/plans/cards — lightweight plan data for card rendering (no full details). */
export const getPlansCards = async (): Promise<Plan[]> => {
  return publicFetch<Plan[]>("/api/plans/cards");
};

/** GET /api/plan-interactions/engagement — batch fetch likes, dislikes, comment counts for all plans. */
export const getEngagement = async (): Promise<Record<string, PlanEngagement>> => {
  return publicFetch<Record<string, PlanEngagement>>("/api/plan-interactions/engagement");
};
