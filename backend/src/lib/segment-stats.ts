/**
 * Segment stats — aggregates "popular with [segment]" data.
 *
 * Shows which plans are most liked by users in each segment (e.g., "top plans for gamers").
 * Used by the frontend to display social proof and recommendations.
 *
 * Caching strategy (two-tier):
 *  1. In-memory cache per segment (5 min TTL) — fastest, avoids any I/O
 *  2. Firestore "segmentStats" collection — persists computed stats across server restarts
 *  3. If both are stale, recomputes from the "userSegments" collection
 *
 * Minimum threshold: stats are only computed when a segment has ≥5 users to avoid
 * showing misleading data from small sample sizes.
 */

import { db } from "./firebase.js";
import type { PersonaSegment, SegmentStats } from "../types.js";

const USER_SEGMENTS_COL = "userSegments";
const SEGMENT_STATS_COL = "segmentStats";
const MIN_USERS_FOR_STATS = 5; // Don't show stats until a segment has at least 5 users

// In-memory cache per segment (5 min TTL)
const statsCache = new Map<string, { data: SegmentStats; expires: number }>();
const STATS_TTL = 5 * 60_000;

/**
 * Get aggregated stats for a segment: total users, top 10 liked plans, and like rates.
 * Uses a two-tier cache (in-memory → Firestore → recompute from userSegments).
 */
export async function getSegmentStats(segment: PersonaSegment): Promise<SegmentStats | null> {
  // Tier 1: Check in-memory cache
  const cached = statsCache.get(segment);
  if (cached && Date.now() < cached.expires) return cached.data;

  // Tier 2: Check Firestore cache (persisted stats)
  const docRef = db.collection(SEGMENT_STATS_COL).doc(segment);
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data() as SegmentStats;
    if (Date.now() - data.updatedAt < STATS_TTL) {
      statsCache.set(segment, { data, expires: Date.now() + STATS_TTL });
      return data;
    }
  }

  // Tier 3: Recompute from the userSegments collection
  const usersSnap = await db
    .collection(USER_SEGMENTS_COL)
    .where("segment", "==", segment)
    .get();

  const totalUsers = usersSnap.size;

  // Don't compute stats for segments with too few users (unreliable data)
  if (totalUsers < MIN_USERS_FOR_STATS) {
    const empty: SegmentStats = { segment, totalUsers, topPlanIds: [], planLikeRates: {}, updatedAt: Date.now() };
    statsCache.set(segment, { data: empty, expires: Date.now() + STATS_TTL });
    return empty;
  }

  // Count how many users in this segment liked each plan
  const planCounts: Record<number, number> = {};
  for (const doc of usersSnap.docs) {
    const likedPlans = (doc.data().likedPlans as number[]) || [];
    for (const planId of likedPlans) {
      planCounts[planId] = (planCounts[planId] || 0) + 1;
    }
  }

  // Sort by like count (most popular first), take top 10
  const sorted = Object.entries(planCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topPlanIds = sorted.map(([id]) => Number(id));
  // Calculate like rate as a percentage: (users who liked / total users in segment) * 100
  const planLikeRates: Record<number, number> = {};
  for (const [id, count] of sorted) {
    planLikeRates[Number(id)] = Math.round((count / totalUsers) * 100);
  }

  const stats: SegmentStats = {
    segment,
    totalUsers,
    topPlanIds,
    planLikeRates,
    updatedAt: Date.now(),
  };

  // Persist computed stats to Firestore for the next server instance (fire-and-forget)
  docRef.set(stats).catch(() => { /* non-critical */ });

  statsCache.set(segment, { data: stats, expires: Date.now() + STATS_TTL });
  return stats;
}

/**
 * Update a user's liked plans in the userSegments collection when they like/unlike a plan.
 * Called fire-and-forget from the interaction service.
 * Also invalidates the in-memory stats cache for the affected segment.
 */
export async function updateUserSegment(
  uid: string,
  segment: PersonaSegment,
  likedPlanId: number,
  action: "add" | "remove",
) {
  const { FieldValue } = await import("firebase-admin/firestore");
  const ref = db.collection(USER_SEGMENTS_COL).doc(uid);

  await ref.set(
    {
      segment,
      likedPlans:
        action === "add"
          ? FieldValue.arrayUnion(likedPlanId)   // Add plan ID to the liked list
          : FieldValue.arrayRemove(likedPlanId),  // Remove plan ID from the liked list
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  // Invalidate the in-memory cache so the next stats request recomputes fresh data
  statsCache.delete(segment);
}
