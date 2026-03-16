import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import * as PersonaService from "../services/persona.service.js";
import type { PersonaProfile, PersonaSignals } from "../types.js";

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
