/**
 * Shared validation utilities for request parameters.
 */

import type { Response } from "express";
import { validPlanIds } from "../services/plan.service.js";

/**
 * Validates that a plan ID from the URL params is a valid integer and exists in the plan catalog.
 * Sends a 400 response and returns null if invalid; returns the raw string ID if valid.
 * Used by interactions controller to validate :id route params before processing.
 */
export function validatePlanId(id: string | string[], res: Response): string | null {
  const raw = Array.isArray(id) ? id[0] : id;
  const num = Number(raw);
  if (!raw || !Number.isInteger(num) || !validPlanIds.has(num)) {
    res.status(400).json({ error: "Invalid plan ID" });
    return null;
  }
  return raw;
}
