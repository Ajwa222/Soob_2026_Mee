/**
 * Persona controller — manages user personas (segments) and behavioral signals.
 *
 * Personas allow the platform to personalize plan recommendations and
 * adjust the AI advisor's tone/focus based on user type (gamer, student, etc.).
 */

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import * as PersonaService from "../services/persona.service.js";
import type { PersonaProfile, PersonaSignals } from "../types.js";

/** GET /api/persona — Fetch the authenticated user's persona profile (or null if none exists) */
export const getPersona = async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    const persona = await PersonaService.getPersona(uid);
    res.json({ persona });
  } catch (err) {
    console.error("Get persona error:", err);
    res.status(500).json({ error: "Failed to get persona" });
  }
};

/** DELETE /api/persona — Clear the user's persona and remove them from segment stats */
export const deletePersona = async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    await PersonaService.clearPersona(uid);
    res.json({ cleared: true });
  } catch (err) {
    console.error("Delete persona error:", err);
    res.status(500).json({ error: "Failed to delete persona" });
  }
};

/** PUT /api/persona — Save or update the user's persona profile (typically after completing the quiz) */
export const savePersona = async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    const { persona } = req.body as { persona: PersonaProfile };
    const result = await PersonaService.savePersona(uid, persona);

    if (result.error) {
      res.status(result.status!).json({ error: result.error });
      return;
    }
    res.json({ persona: result.persona });
  } catch (err) {
    console.error("Save persona error:", err);
    res.status(500).json({ error: "Failed to save persona" });
  }
};

/**
 * POST /api/persona/signals — Merge behavioral signals from the frontend.
 *
 * The frontend periodically sends browsing signals (categories viewed, filters used, etc.).
 * If the user already has a persona, signals are merged into it.
 * If not, they're stored as "pending signals" and merged when the persona is created.
 */
export const mergeSignals = async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).uid!;
    const { signals } = req.body as { signals: Partial<PersonaSignals> };

    if (!signals || typeof signals !== "object") {
      res.status(400).json({ error: "Invalid signals data" });
      return;
    }

    await PersonaService.mergeUserSignals(uid, signals);
    res.json({ merged: true });
  } catch (err) {
    console.error("Merge signals error:", err);
    res.status(500).json({ error: "Failed to merge signals" });
  }
};

/** GET /api/persona/segment-stats/:segment — Get aggregated stats (top plans, like rates) for a segment */
export const getSegmentStats = async (req: Request, res: Response) => {
  try {
    const stats = await PersonaService.getSegmentStatsForSegment(req.params.segment as string);
    if (!stats) {
      res.status(400).json({ error: "Invalid segment" });
      return;
    }
    res.json(stats);
  } catch (err) {
    console.error("Segment stats error:", err);
    res.status(500).json({ error: "Failed to get segment stats" });
  }
};
