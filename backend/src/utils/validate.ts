import type { Response } from "express";
import { validPlanIds } from "../services/plan.service.js";

export function validatePlanId(id: string | string[], res: Response): string | null {
  const raw = Array.isArray(id) ? id[0] : id;
  const num = Number(raw);
  if (!raw || !Number.isInteger(num) || !validPlanIds.has(num)) {
    res.status(400).json({ error: "Invalid plan ID" });
    return null;
  }
  return raw;
}
