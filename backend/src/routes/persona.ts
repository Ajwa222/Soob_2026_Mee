import { Router } from "express";
import { db } from "../lib/firebase.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { isValidSegment } from "../lib/persona-scoring.js";
import { getSegmentStats } from "../lib/segment-stats.js";
import type { PersonaProfile, PersonaSignals } from "../types.js";

const router = Router();

function mergePendingSignals(base: PersonaSignals, pending: PersonaSignals): PersonaSignals {
  const merged: PersonaSignals = {
    categoriesViewed: { ...base.categoriesViewed },
    priceRangeClicks: { ...base.priceRangeClicks },
    filtersUsed: { ...base.filtersUsed },
    planTypesViewed: { ...base.planTypesViewed },
    totalPlanViews: base.totalPlanViews,
    compareCount: base.compareCount,
  };
  for (const [k, v] of Object.entries(pending.categoriesViewed)) {
    merged.categoriesViewed[k] = (merged.categoriesViewed[k] || 0) + v;
  }
  merged.priceRangeClicks.low += pending.priceRangeClicks.low;
  merged.priceRangeClicks.mid += pending.priceRangeClicks.mid;
  merged.priceRangeClicks.high += pending.priceRangeClicks.high;
  for (const [k, v] of Object.entries(pending.filtersUsed)) {
    merged.filtersUsed[k] = (merged.filtersUsed[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pending.planTypesViewed)) {
    merged.planTypesViewed[k] = (merged.planTypesViewed[k] || 0) + v;
  }
  merged.totalPlanViews += pending.totalPlanViews;
  merged.compareCount += pending.compareCount;
  return merged;
}

const EMPTY_SIGNALS: PersonaSignals = {
  categoriesViewed: {},
  priceRangeClicks: { low: 0, mid: 0, high: 0 },
  filtersUsed: {},
  planTypesViewed: {},
  totalPlanViews: 0,
  compareCount: 0,
};

/** GET /api/persona — get current user's persona */
router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    const snap = await db.collection("users").doc(uid).get();
    const persona = snap.exists ? (snap.data()?.persona as PersonaProfile | undefined) : undefined;

    if (!persona) {
      res.json({ persona: null });
      return;
    }
    res.json({ persona });
  } catch (err) {
    console.error("Get persona error:", err);
    res.status(500).json({ error: "Failed to get persona" });
  }
});

/** DELETE /api/persona — clear persona and pending signals */
router.delete("/", requireAuth, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    await db.collection("users").doc(uid).set(
      { persona: null, pendingSignals: null },
      { merge: true },
    );
    await db.collection("userSegments").doc(uid).delete().catch(() => {});
    res.json({ cleared: true });
  } catch (err) {
    console.error("Delete persona error:", err);
    res.status(500).json({ error: "Failed to delete persona" });
  }
});

/** PUT /api/persona — save/update persona */
router.put("/", requireAuth, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    const { persona } = req.body as { persona: PersonaProfile };

    if (!persona || !isValidSegment(persona.segment)) {
      res.status(400).json({ error: "Invalid persona data" });
      return;
    }

    if (typeof persona.confidence !== "number" || persona.confidence < 0 || persona.confidence > 1) {
      res.status(400).json({ error: "Confidence must be 0-1" });
      return;
    }

    // Check for pending signals stored before persona existed
    const userSnap = await db.collection("users").doc(uid).get();
    const pendingSignals = userSnap.exists ? (userSnap.data()?.pendingSignals as PersonaSignals | undefined) : undefined;

    const baseSignals = persona.signals || EMPTY_SIGNALS;
    const finalSignals: PersonaSignals = pendingSignals
      ? mergePendingSignals(baseSignals, pendingSignals)
      : baseSignals;

    const profile: PersonaProfile = {
      segment: persona.segment,
      confidence: persona.confidence,
      quizAnswers: persona.quizAnswers,
      signals: finalSignals,
      updatedAt: Date.now(),
      createdAt: persona.createdAt || Date.now(),
    };

    const writeData: Record<string, unknown> = { persona: profile };
    if (pendingSignals) writeData.pendingSignals = null; // clear pending
    await db.collection("users").doc(uid).set(writeData, { merge: true });

    // Also update userSegments for community stats
    await db.collection("userSegments").doc(uid).set(
      { segment: profile.segment, updatedAt: Date.now() },
      { merge: true },
    );

    res.json({ persona: profile });
  } catch (err) {
    console.error("Save persona error:", err);
    res.status(500).json({ error: "Failed to save persona" });
  }
});

/** POST /api/persona/signals — merge implicit signals */
router.post("/signals", requireAuth, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    const { signals } = req.body as { signals: Partial<PersonaSignals> };

    if (!signals || typeof signals !== "object") {
      res.status(400).json({ error: "Invalid signals data" });
      return;
    }

    // Read current persona
    const snap = await db.collection("users").doc(uid).get();
    const current = snap.exists ? (snap.data()?.persona as PersonaProfile | undefined) : undefined;

    // Merge signals additively (even if no persona exists yet, store as pendingSignals)
    const baseSignals = current?.signals ?? EMPTY_SIGNALS;
    const merged: PersonaSignals = { ...baseSignals };

    if (signals.categoriesViewed) {
      for (const [k, v] of Object.entries(signals.categoriesViewed)) {
        merged.categoriesViewed[k] = (merged.categoriesViewed[k] || 0) + v;
      }
    }
    if (signals.priceRangeClicks) {
      merged.priceRangeClicks.low += signals.priceRangeClicks.low || 0;
      merged.priceRangeClicks.mid += signals.priceRangeClicks.mid || 0;
      merged.priceRangeClicks.high += signals.priceRangeClicks.high || 0;
    }
    if (signals.filtersUsed) {
      for (const [k, v] of Object.entries(signals.filtersUsed)) {
        merged.filtersUsed[k] = (merged.filtersUsed[k] || 0) + v;
      }
    }
    if (signals.planTypesViewed) {
      for (const [k, v] of Object.entries(signals.planTypesViewed)) {
        merged.planTypesViewed[k] = (merged.planTypesViewed[k] || 0) + v;
      }
    }
    merged.totalPlanViews += signals.totalPlanViews || 0;
    merged.compareCount += signals.compareCount || 0;

    if (current) {
      // Update existing persona's signals
      await db.collection("users").doc(uid).set(
        { persona: { signals: merged, updatedAt: Date.now() } },
        { merge: true },
      );
    } else {
      // No persona yet — store as pending signals for later merge
      await db.collection("users").doc(uid).set(
        { pendingSignals: merged, pendingSignalsUpdatedAt: Date.now() },
        { merge: true },
      );
    }

    res.json({ merged: true });
  } catch (err) {
    console.error("Merge signals error:", err);
    res.status(500).json({ error: "Failed to merge signals" });
  }
});

/** GET /api/persona/segment-stats/:segment — public endpoint */
router.get("/segment-stats/:segment", async (req, res) => {
  try {
    const { segment } = req.params;
    if (!isValidSegment(segment)) {
      res.status(400).json({ error: "Invalid segment" });
      return;
    }

    const stats = await getSegmentStats(segment);
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(stats);
  } catch (err) {
    console.error("Segment stats error:", err);
    res.status(500).json({ error: "Failed to get segment stats" });
  }
});

export default router;
