/**
 * Recommendations service — fetches personalized or popularity-based plan recommendations.
 *
 * Uses authenticated fetch for logged-in users (enables collaborative filtering based on
 * the user's reactions), and public fetch for anonymous users (popularity-only fallback).
 */
import { publicFetch, apiFetch } from "./apiClient";

export interface RecommendationResult {
  planIds: number[];                                 // Recommended plan IDs, sorted by relevance
  strategy: "popularity" | "collaborative" | "content-based";  // Which algorithm was used
}

/**
 * GET /api/recommendations?limit=N — fetch recommended plan IDs.
 *
 * @param isLoggedIn - If true, uses authenticated fetch for collaborative filtering
 * @param limit      - Max number of recommendations (default 10)
 * @returns Plan IDs and the strategy used to generate them
 */
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
