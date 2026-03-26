/**
 * Recommendation service — personalized plan recommendations.
 *
 * Three strategies (in priority order):
 *  1. **Collaborative filtering** — "users who liked the same plans as you also liked these."
 *     Used when other users have liked the same plans as the current user.
 *  2. **Content-based** — finds plans similar to the ones the user liked (price, data, type).
 *     Used when the user has likes but no other users share their taste yet.
 *  3. **Global popularity** — top N plans by like count across all users.
 *     Used for anonymous users or users with no likes.
 *
 * All strategies read from the existing "planReactions" Firestore collection and
 * in-memory plan data, so no new collections are needed.
 */

import * as ReactionModel from "../models/reaction.model.js";
import { db } from "../lib/firebase.js";
import { PLANS_DATA } from "../data/plans.js";
import type { Plan } from "../types.js";

interface RecommendationResult {
  planIds: number[];
  strategy: "popularity" | "collaborative" | "content-based";
}

// ── Global popularity cache ──
let popularityCache: { data: number[]; expires: number } | null = null;
const POPULARITY_TTL = 5 * 60_000; // 5 minutes

// ── Reactions snapshot cache (shared across strategies) ──
let reactionsCache: {
  data: Map<string, { likes: number; likedBy: string[] }>;
  expires: number;
} | null = null;
const REACTIONS_TTL = 60_000; // 1 minute

// Plan lookup map (built once)
const PLAN_MAP = new Map<number, Plan>(PLANS_DATA.map((p) => [p.id, p]));

/** Load all reactions into a cached map */
async function getReactionsMap(): Promise<Map<string, { likes: number; likedBy: string[] }>> {
  if (reactionsCache && Date.now() < reactionsCache.expires) {
    return reactionsCache.data;
  }

  const snap = await ReactionModel.getAllReactions();
  const map = new Map<string, { likes: number; likedBy: string[] }>();

  for (const doc of snap.docs) {
    const d = doc.data();
    map.set(doc.id, {
      likes: Math.max(0, d.likes ?? 0),
      likedBy: d.likedBy ?? [],
    });
  }

  reactionsCache = { data: map, expires: Date.now() + REACTIONS_TTL };
  return map;
}

/**
 * Get globally popular plans sorted by like count.
 */
async function getGlobalPopularity(limit: number): Promise<number[]> {
  if (popularityCache && Date.now() < popularityCache.expires) {
    return popularityCache.data.slice(0, limit);
  }

  const reactions = await getReactionsMap();

  const sorted = [...reactions.entries()]
    .filter(([, r]) => r.likes > 0)
    .sort((a, b) => b[1].likes - a[1].likes)
    .map(([planId]) => Number(planId));

  popularityCache = { data: sorted.slice(0, 50), expires: Date.now() + POPULARITY_TTL };
  return sorted.slice(0, limit);
}

/**
 * Collaborative filtering: find plans liked by users with similar taste.
 *
 * Algorithm:
 *  1. Get all plans the current user has liked
 *  2. For each of those plans, find other users who also liked them
 *  3. Collect all plans those "similar users" liked (excluding ones the user already liked)
 *  4. Rank by frequency (how many similar users liked each plan)
 */
async function getCollaborativeRecommendations(
  uid: string,
  userLikedPlanIds: string[],
  limit: number,
): Promise<number[]> {
  const reactions = await getReactionsMap();

  // Find similar users (who liked the same plans)
  const similarUsers = new Set<string>();
  for (const planId of userLikedPlanIds) {
    const r = reactions.get(planId);
    if (r) {
      for (const userId of r.likedBy) {
        if (userId !== uid) similarUsers.add(userId);
      }
    }
  }

  if (similarUsers.size === 0) return [];

  // Count how often similar users liked other plans
  const userLikedSet = new Set(userLikedPlanIds);
  const planScores = new Map<string, number>();

  for (const [planId, r] of reactions) {
    if (userLikedSet.has(planId)) continue;
    let count = 0;
    for (const userId of r.likedBy) {
      if (similarUsers.has(userId)) count++;
    }
    if (count > 0) planScores.set(planId, count);
  }

  return [...planScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([planId]) => Number(planId));
}

/** Parse a data/minutes string to a number (Unlimited = Infinity) */
function parseVal(val: string): number {
  if (!val || val === "-") return 0;
  if (val === "Unlimited") return Infinity;
  return parseFloat(val) || 0;
}

/**
 * Content-based filtering: find plans similar to the ones the user liked.
 *
 * Computes an "average profile" from the user's liked plans, then scores all
 * other plans by how closely they match that profile.
 */
function getContentBasedRecommendations(
  userLikedPlanIds: string[],
  limit: number,
): number[] {
  const likedPlans = userLikedPlanIds
    .map((id) => PLAN_MAP.get(Number(id)))
    .filter(Boolean) as Plan[];

  if (likedPlans.length === 0) return [];

  // Build average profile from liked plans
  const avgPrice = likedPlans.reduce((s, p) => s + p.priceSAR, 0) / likedPlans.length;
  const avgData = likedPlans.reduce((s, p) => s + parseVal(p.dataGB), 0) / likedPlans.length;
  const avgCalls = likedPlans.reduce((s, p) => s + parseVal(p.localCallMinutes), 0) / likedPlans.length;
  const likedTypes = new Set(likedPlans.map((p) => p.planType));
  const likedProviders = new Set(likedPlans.map((p) => p.provider));
  const likedIds = new Set(userLikedPlanIds.map(Number));

  // Score each plan by similarity to the average profile
  const scored: { id: number; score: number }[] = [];

  for (const plan of PLANS_DATA) {
    if (likedIds.has(plan.id)) continue;

    let score = 0;

    // Price similarity (closer = higher score, max 30 points)
    const priceDiff = Math.abs(plan.priceSAR - avgPrice);
    score += Math.max(0, 30 - (priceDiff / avgPrice) * 30);

    // Data similarity (max 25 points)
    const planData = parseVal(plan.dataGB);
    if (avgData === Infinity && planData === Infinity) {
      score += 25;
    } else if (avgData > 0 && planData > 0) {
      const ratio = Math.min(planData, avgData) / Math.max(planData, avgData);
      score += ratio * 25;
    }

    // Calls similarity (max 15 points)
    const planCalls = parseVal(plan.localCallMinutes);
    if (avgCalls === Infinity && planCalls === Infinity) {
      score += 15;
    } else if (avgCalls > 0 && planCalls > 0) {
      const ratio = Math.min(planCalls, avgCalls) / Math.max(planCalls, avgCalls);
      score += ratio * 15;
    }

    // Same plan type bonus (15 points)
    if (likedTypes.has(plan.planType)) score += 15;

    // Different provider bonus (10 points — show alternatives)
    if (!likedProviders.has(plan.provider)) score += 10;

    // Feature overlap (5 points)
    const likedFeatures = likedPlans.some(
      (p) => p.specialFeatures?.toLowerCase().includes("5g"),
    );
    if (likedFeatures && plan.specialFeatures?.toLowerCase().includes("5g")) {
      score += 5;
    }

    scored.push({ id: plan.id, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.id);
}

/**
 * Find which plans a user has liked.
 */
async function getUserLikedPlans(uid: string): Promise<string[]> {
  const reactions = await getReactionsMap();
  const liked: string[] = [];
  for (const [planId, r] of reactions) {
    if (r.likedBy.includes(uid)) {
      liked.push(planId);
    }
  }
  return liked;
}

/**
 * Get the user's bookmarked plan IDs from Firestore.
 * Bookmarks are stored at users/{uid}.bookmarks as a number array.
 */
async function getUserBookmarks(uid: string): Promise<string[]> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return [];
    const data = snap.data();
    const bookmarks = data?.bookmarks;
    if (!Array.isArray(bookmarks)) return [];
    return bookmarks.map((id: number) => String(id));
  } catch {
    return [];
  }
}

/**
 * Main entry point: get recommendations for a user.
 *
 * - If uid is provided and user has likes → try collaborative, then content-based
 * - Otherwise → global popularity
 */
export async function getRecommendations(
  uid: string | undefined,
  limit: number = 10,
): Promise<RecommendationResult> {
  if (uid) {
    // Merge likes and bookmarks into one set of "interested" plan IDs
    const [likedIds, bookmarkIds] = await Promise.all([
      getUserLikedPlans(uid),
      getUserBookmarks(uid),
    ]);
    const interestedSet = new Set([...likedIds, ...bookmarkIds]);
    const interestedPlanIds = [...interestedSet];

    if (interestedPlanIds.length > 0) {
      // Try collaborative filtering using all interested plans (likes + bookmarks)
      const collaborative = await getCollaborativeRecommendations(uid, interestedPlanIds, limit);

      if (collaborative.length >= 3) {
        return { planIds: collaborative, strategy: "collaborative" };
      }

      // Fall back to content-based filtering (uses both likes and bookmarks)
      const contentBased = getContentBasedRecommendations(interestedPlanIds, limit);

      if (contentBased.length > 0) {
        // If we have some collaborative results, put them first
        if (collaborative.length > 0) {
          const seen = new Set(collaborative);
          const merged = [...collaborative];
          for (const id of contentBased) {
            if (!seen.has(id) && merged.length < limit) {
              merged.push(id);
              seen.add(id);
            }
          }
          return { planIds: merged, strategy: "collaborative" };
        }
        return { planIds: contentBased, strategy: "content-based" };
      }
    }
  }

  // Fallback: global popularity
  const popular = await getGlobalPopularity(limit);
  return { planIds: popular, strategy: "popularity" };
}
