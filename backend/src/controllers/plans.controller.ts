/**
 * Plans controller — handles HTTP request/response for plan endpoints.
 * All plan data is served from in-memory storage (no Firestore queries).
 * The service layer pre-serializes JSON at startup for fast responses.
 */

import type { Request, Response } from "express";
import * as PlanService from "../services/plan.service.js";

/** GET /api/plans/cards — Returns slim plan data optimized for card UI rendering */
export const getCards = (_req: Request, res: Response) => {
  // send() is used instead of json() because the service returns pre-serialized JSON strings
  res.send(PlanService.getPlansCardsJson());
};

/** GET /api/plans — Returns all 154 plans with full details */
export const getAll = (_req: Request, res: Response) => {
  res.send(PlanService.getAllPlansJson());
};

/** GET /api/plans/:id — Returns a single plan by its numeric ID */
export const getById = (req: Request, res: Response) => {
  const plan = PlanService.getPlanById(Number(req.params.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(plan);
};
