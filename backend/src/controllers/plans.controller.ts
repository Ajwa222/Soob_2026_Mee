import type { Request, Response } from "express";
import * as PlanService from "../services/plan.service.js";

export const getCards = (_req: Request, res: Response) => {
  res.send(PlanService.getPlansCardsJson());
};

export const getPersonalized = (req: Request, res: Response) => {
  const segment = req.query.segment as string;
  const json = PlanService.getPersonalizedPlans(segment);
  if (!json) {
    res.status(400).json({ error: "Invalid or missing segment parameter" });
    return;
  }
  res.send(json);
};

export const getAll = (_req: Request, res: Response) => {
  res.send(PlanService.getAllPlansJson());
};

export const getById = (req: Request, res: Response) => {
  const plan = PlanService.getPlanById(Number(req.params.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(plan);
};
