import type { Request, Response } from "express";
import { analyzeUsageAndMatch } from "../services/lab.service.js";
import { PLANS_DATA } from "../data/plans.js";

export async function analyzeUsage(req: Request, res: Response): Promise<void> {
  try {
    const { imageDataUrl, budget, currentPlanId } = req.body ?? {};

    // imageDataUrl is optional — user can get a recommendation based on just
    // their current plan (budget-only matching). If provided, must be a data: URL.
    const hasImage = typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/");
    if (imageDataUrl !== undefined && !hasImage) {
      res.status(400).json({ error: "Invalid imageDataUrl (must be a data: URL if provided)" });
      return;
    }
    const budgetNum = Number(budget);
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      res.status(400).json({ error: "Missing or invalid budget" });
      return;
    }
    const planIdNum = currentPlanId == null ? undefined : Number(currentPlanId);
    const planIdProvided = currentPlanId != null && currentPlanId !== "";
    const planIdValid = typeof planIdNum === "number" && Number.isFinite(planIdNum);

    // If the caller provided a currentPlanId but it doesn't match any plan, fail
    // loudly instead of silently ignoring — otherwise they'd get generic results
    // with no hint that their selection wasn't used.
    if (planIdProvided) {
      if (!planIdValid) {
        res.status(400).json({ error: "Invalid currentPlanId (must be a number)" });
        return;
      }
      if (!PLANS_DATA.some((p) => p.id === planIdNum)) {
        res.status(400).json({ error: `No plan found with id ${planIdNum}` });
        return;
      }
    }

    const result = await analyzeUsageAndMatch(
      hasImage ? imageDataUrl : undefined,
      budgetNum,
      planIdValid ? planIdNum : undefined,
    );
    res.json(result);
  } catch (err) {
    console.error("Lab analyze-usage error:", err);
    res.status(500).json({ error: "Failed to analyze usage" });
  }
}
