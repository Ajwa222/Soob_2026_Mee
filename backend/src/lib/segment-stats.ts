import { db } from "./firebase.js";
import type { PersonaSegment, SegmentStats } from "../types.js";

const USER_SEGMENTS_COL = "userSegments";
const SEGMENT_STATS_COL = "segmentStats";
const MIN_USERS_FOR_STATS = 5;

// In-memory cache per segment (5 min TTL)
const statsCache = new Map<string, { data: SegmentStats; expires: number }>();
const STATS_TTL = 5 * 60_000;

export async function getSegmentStats(segment: PersonaSegment): Promise<SegmentStats | null> {
  const cached = statsCache.get(segment);
  if (cached && Date.now() < cached.expires) return cached.data;

  // Try Firestore cache first
  const docRef = db.collection(SEGMENT_STATS_COL).doc(segment);
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data() as SegmentStats;
    // Use Firestore doc if it's fresh enough
    if (Date.now() - data.updatedAt < STATS_TTL) {
      statsCache.set(segment, { data, expires: Date.now() + STATS_TTL });
      return data;
    }
  }

  // Recompute from userSegments collection
  const usersSnap = await db
    .collection(USER_SEGMENTS_COL)
    .where("segment", "==", segment)
    .get();

  const totalUsers = usersSnap.size;
  if (totalUsers < MIN_USERS_FOR_STATS) {
    const empty: SegmentStats = { segment, totalUsers, topPlanIds: [], planLikeRates: {}, updatedAt: Date.now() };
    statsCache.set(segment, { data: empty, expires: Date.now() + STATS_TTL });
    return empty;
  }

  // Aggregate liked plans
  const planCounts: Record<number, number> = {};
  for (const doc of usersSnap.docs) {
    const likedPlans = (doc.data().likedPlans as number[]) || [];
    for (const planId of likedPlans) {
      planCounts[planId] = (planCounts[planId] || 0) + 1;
    }
  }

  // Sort by like count, take top 10
  const sorted = Object.entries(planCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topPlanIds = sorted.map(([id]) => Number(id));
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

  // Persist to Firestore for cache
  docRef.set(stats).catch(() => { /* non-critical */ });

  statsCache.set(segment, { data: stats, expires: Date.now() + STATS_TTL });
  return stats;
}

/** Update the userSegments doc when a user likes a plan */
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
          ? FieldValue.arrayUnion(likedPlanId)
          : FieldValue.arrayRemove(likedPlanId),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  // Invalidate cache for this segment
  statsCache.delete(segment);
}
