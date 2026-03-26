import { publicFetch, apiFetch } from "./apiClient";

export interface RecommendationResult {
  planIds: number[];
  strategy: "popularity" | "collaborative" | "content-based";
}

/** Fetch recommended plan IDs. Uses auth if available for collaborative filtering. */
export async function getRecommendations(
  isLoggedIn: boolean,
  limit: number = 10,
): Promise<RecommendationResult> {
  const path = `/api/recommendations?limit=${limit}`;
  // Use authenticated fetch for logged-in users (enables collaborative filtering)
  if (isLoggedIn) {
    return apiFetch<RecommendationResult>(path);
  }
  return publicFetch<RecommendationResult>(path);
}
