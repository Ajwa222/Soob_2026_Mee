import { publicFetch } from "./apiClient";
import type { Plan } from "../types";
import type { PlanEngagement } from "../context/PlansContext";

export const getPlansCards = async (): Promise<Plan[]> => {
  return publicFetch<Plan[]>("/api/plans/cards");
};

export const getEngagement = async (): Promise<Record<string, PlanEngagement>> => {
  return publicFetch<Record<string, PlanEngagement>>("/api/plan-interactions/engagement");
};
