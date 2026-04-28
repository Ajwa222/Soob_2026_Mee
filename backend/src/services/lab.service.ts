/**
 * Lab service — experimental usage-based plan matcher.
 *
 * Flow:
 *  1. Receives a phone-settings screenshot + budget
 *  2. Asks GPT (vision model) to extract the total GB used in the last month
 *  3. Matches that usage + budget against PLANS_DATA and returns the best fit
 *
 * "Best fit" rule:
 *  - Plan must be within budget
 *  - Plan data allowance must be ≥ 1.2× the user's usage (small buffer)
 *  - If multiple qualify, prefer: cheapest plan that meets the buffer rule
 *  - If no plan has enough data within budget, return the one with the
 *    highest data allowance under budget (best effort)
 */
import OpenAI from "openai";
import { PLANS_DATA } from "../data/plans.js";
import type { Plan } from "../types.js";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export type LabUsage = {
  totalGB: number;
  confidence: "high" | "medium" | "low";
  notes: string;
};

export type LabDiagnosis =
  | "overpaying"      // Using << current plan allowance → can save money
  | "under-served"    // Using ≈ or > current plan allowance → need more data
  | "good-fit"        // Usage fits current plan → maybe find cheaper equivalent
  | "no-current"      // No current plan given → just filter by usage + default budget
  | "no-usage"        // No screenshot → just budget-based match
  | "budget-too-low"  // Budget is below the cheapest plan in the catalog
  | "no-match";       // Budget is valid but no plans meet the usage/buffer filter

export type LabMatch = {
  usage: LabUsage;
  plans: Plan[];
  diagnosis: LabDiagnosis;
  headline: string;    // Short one-liner: "You're paying for 40 GB but only using 12"
  reasoning: string;   // Longer explanation paragraph
};

/**
 * Extract total GB used from a phone-settings screenshot using GPT Vision.
 * Image should be a full base64 data URL (e.g. "data:image/png;base64,iVBOR...").
 */
async function extractUsageFromImage(imageDataUrl: string): Promise<LabUsage> {
  // Dev/illustration fallback — if no real OpenAI key is configured, skip the
  // vision call and return a plausible mock so the rest of the flow is testable.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return {
      totalGB: 28.4,
      confidence: "medium",
      notes: "Demo mode — OpenAI key not configured, returning mock usage.",
    };
  }
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content:
          "You analyze phone-settings screenshots showing mobile/cellular data usage. " +
          "Your job: return the TOTAL data consumed in the current billing cycle in GB. " +
          'Return JSON only: {"totalGB": number, "confidence": "high"|"medium"|"low", "notes": string}.\n\n' +
          "HOW TO COMPUTE THE TOTAL:\n" +
          "1. If the screenshot already shows a single total (e.g. a header like 'Mobile data: 28.4 GB' " +
          "or 'Cellular total: 12.7 GB'), use that number directly. High confidence.\n" +
          "2. If the screenshot shows a LIST of apps with per-app data usage, SUM ALL the per-app " +
          "values to get the total — don't pick just one. Convert MB → GB (divide by 1024 or 1000; " +
          "use 1024 for binary, or 1000 if the OS displays decimal). Convert KB → GB similarly.\n" +
          "3. If the screenshot shows both cellular AND Wi-Fi columns, use CELLULAR only (that's what " +
          "consumes plan data). Don't add Wi-Fi.\n" +
          "4. If a period/date range is visible, note it. If it's clearly NOT the current month " +
          "(e.g. only shows 'today' or 'last 7 days'), lower confidence.\n" +
          "5. Round the final sum to one decimal place.\n\n" +
          "UNREADABLE CASES:\n" +
          "If the image is blank, unrelated, or you can't identify any usage data, set totalGB=0, " +
          "confidence='low', and explain briefly in notes (e.g. 'no data usage visible', " +
          "'shows Wi-Fi only', 'image too blurry').\n\n" +
          "In 'notes' briefly say how you computed the total (e.g. 'Summed 12 apps across cellular " +
          "column' or 'Used header total of 28.4 GB').",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Compute the total cellular/mobile data used this billing cycle in GB. " +
              "If this is a per-app list, SUM every row's cellular usage. Return JSON.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      totalGB: Number(parsed.totalGB) || 0,
      confidence: ["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : "low",
      notes: String(parsed.notes ?? ""),
    };
  } catch {
    return { totalGB: 0, confidence: "low", notes: "Couldn't parse model response." };
  }
}

/**
 * Parse a plan's dataGB field — can be "20", "Unlimited", "-", etc.
 * Returns Infinity for unlimited, 0 for missing/unparseable.
 */
function parsePlanData(dataGB: string): number {
  if (!dataGB || dataGB === "-") return 0;
  if (/unlimited/i.test(dataGB)) return Infinity;
  const n = parseFloat(dataGB);
  return Number.isFinite(n) ? n : 0;
}

/** Pick up to N plans matching a filter, sorted by a comparator. */
function takeTop(
  predicate: (p: Plan) => boolean,
  compare: (a: Plan, b: Plan) => number,
  n: number,
  excludeId?: number,
): Plan[] {
  return PLANS_DATA.filter((p) => p.id !== excludeId && predicate(p))
    .sort(compare)
    .slice(0, n);
}

/**
 * Decide how the user is doing and return tailored plan picks + a headline.
 *
 * Logic:
 *  - If no usage screenshot and no current plan → too little info, just return
 *    a generic "some plans under default budget" list.
 *  - If current plan provided but no usage → return cheaper plans with at
 *    least as much data as the current plan (budget-only save).
 *  - If usage provided but no current plan → match plans whose data covers
 *    usage × 1.2, cheapest first.
 *  - If both provided → compute utilization (usage / current data allowance):
 *      < 60%  → overpaying: show cheaper plans that still cover usage ×1.2
 *      ≥ 90%  → under-served: show plans with more data (bigger allowance),
 *               at or near the current price
 *      60–90% → good-fit: show cheaper alternatives that cover usage ×1.2
 */
function analyzeAndPick(
  usageGB: number,
  budgetSAR: number,
  currentPlan?: Plan,
): { plans: Plan[]; diagnosis: LabDiagnosis; headline: string; reasoning: string } {
  const BUFFER = 1.2;
  const neededGB = usageGB * BUFFER;
  // Everything the user can afford — hard cap on budget no matter which branch runs.
  const withinBudget = (p: Plan) => p.priceSAR <= budgetSAR;

  // Guard — budget below the cheapest plan in the catalog.
  // Every other branch would silently return an empty list, so we short-circuit
  // with a clear diagnosis so the frontend can tell the user what's wrong.
  const cheapestPrice = PLANS_DATA.reduce(
    (min, p) => (p.priceSAR < min ? p.priceSAR : min),
    Infinity,
  );
  if (Number.isFinite(cheapestPrice) && budgetSAR < cheapestPrice) {
    return {
      plans: [],
      diagnosis: "budget-too-low",
      headline: `No plans under SAR ${budgetSAR} — cheapest starts at SAR ${cheapestPrice}`,
      reasoning:
        `Your budget of SAR ${budgetSAR} is below every plan in our catalog. ` +
        `The cheapest option is SAR ${cheapestPrice}. Raise your budget to see matches.`,
    };
  }

  // Case A — no screenshot, no usage known
  if (usageGB <= 0) {
    if (currentPlan) {
      // Want plans within budget that cover at least ~90% of current data
      const plans = takeTop(
        (p) =>
          withinBudget(p) &&
          parsePlanData(p.dataGB) >= parsePlanData(currentPlan.dataGB) * 0.9,
        (a, b) => a.priceSAR - b.priceSAR,
        3,
        currentPlan.id,
      );
      if (plans.length > 0) {
        return {
          plans,
          diagnosis: "good-fit",
          headline: `Alternatives to ${currentPlan.planName} under SAR ${budgetSAR}`,
          reasoning:
            `We picked plans within your SAR ${budgetSAR} budget that match or beat ` +
            `your current data allowance (${currentPlan.dataGB} GB).`,
        };
      }
    }
    const plans = takeTop(
      withinBudget,
      (a, b) => parsePlanData(b.dataGB) - parsePlanData(a.dataGB),
      3,
    );
    return {
      plans,
      diagnosis: "no-usage",
      headline: plans.length ? `Top plans under SAR ${budgetSAR}` : "No matches within budget",
      reasoning:
        `Without a usage screenshot we can't tell how much data you need. ` +
        `Here are plans under SAR ${budgetSAR} with the most data for your money. ` +
        `Upload a screenshot for a precise match.`,
    };
  }

  // Case B — usage known, no current plan
  if (!currentPlan) {
    const plans = takeTop(
      (p) => withinBudget(p) && parsePlanData(p.dataGB) >= neededGB,
      (a, b) => a.priceSAR - b.priceSAR,
      3,
    );
    if (plans.length > 0) {
      return {
        plans,
        diagnosis: "no-current",
        headline: `${plans.length} plan${plans.length === 1 ? "" : "s"} that fit your ${usageGB.toFixed(1)} GB usage`,
        reasoning:
          `You used about ${usageGB.toFixed(1)} GB this month. These plans cover that ` +
          `(with a 20% buffer) for under SAR ${budgetSAR}.`,
      };
    }
    const fallback = takeTop(
      withinBudget,
      (a, b) => parsePlanData(b.dataGB) - parsePlanData(a.dataGB),
      3,
    );
    return {
      plans: fallback,
      diagnosis: "no-current",
      headline: `Closest fits under SAR ${budgetSAR}`,
      reasoning:
        `Nothing within SAR ${budgetSAR} fully covers ${usageGB.toFixed(1)} GB. ` +
        `These are the largest plans we can offer for that budget.`,
    };
  }

  // Case C — both usage and current plan known
  const currentDataGB = parsePlanData(currentPlan.dataGB);
  const isCurrentUnlimited = !Number.isFinite(currentDataGB);

  // Fallback when a strict filter returns nothing — show the largest-data plans
  // under budget so the user always has something actionable.
  const largestUnderBudget = (): Plan[] =>
    takeTop(
      withinBudget,
      (a, b) => parsePlanData(b.dataGB) - parsePlanData(a.dataGB) || a.priceSAR - b.priceSAR,
      3,
      currentPlan.id,
    );

  // Unlimited current plan — utilization math is meaningless. Ask a simpler
  // question: does any cheaper capped plan cover the user's actual usage?
  if (isCurrentUnlimited) {
    const cheaperCovering = takeTop(
      (p) =>
        withinBudget(p) &&
        p.priceSAR < currentPlan.priceSAR &&
        parsePlanData(p.dataGB) >= neededGB,
      (a, b) => a.priceSAR - b.priceSAR,
      3,
      currentPlan.id,
    );
    if (cheaperCovering.length > 0) {
      const saving = currentPlan.priceSAR - cheaperCovering[0].priceSAR;
      return {
        plans: cheaperCovering,
        diagnosis: "overpaying",
        headline: `You could save ~SAR ${saving.toFixed(0)}/month`,
        reasoning:
          `You're on ${currentPlan.planName} (unlimited data, SAR ${currentPlan.priceSAR}) ` +
          `but only used ${usageGB.toFixed(1)} GB this month. These cheaper plans within ` +
          `SAR ${budgetSAR} still cover your real usage.`,
      };
    }
    return {
      plans: [],
      diagnosis: "good-fit",
      headline: `Unlimited is the right call`,
      reasoning:
        `You used ${usageGB.toFixed(1)} GB this month — no cheaper plan within ` +
        `SAR ${budgetSAR} covers that with a safety buffer. Stay on ${currentPlan.planName}.`,
    };
  }

  // Capped current plan — utilization is meaningful here.
  const utilization = usageGB / currentDataGB;

  // Overpaying (<60%) — find cheaper plans that still cover usage
  if (utilization < 0.6) {
    const plans = takeTop(
      (p) => withinBudget(p) && parsePlanData(p.dataGB) >= neededGB,
      (a, b) => a.priceSAR - b.priceSAR,
      3,
      currentPlan.id,
    );
    if (plans.length > 0) {
      const saving = currentPlan.priceSAR - plans[0].priceSAR;
      return {
        plans,
        diagnosis: "overpaying",
        headline:
          saving > 0
            ? `You could save ~SAR ${saving.toFixed(0)}/month`
            : `You're using less than you pay for`,
        reasoning:
          `Your ${currentPlan.planName} gives you ${currentPlan.dataGB} GB for SAR ${currentPlan.priceSAR}, ` +
          `but you only used ${usageGB.toFixed(1)} GB this month — ` +
          `about ${Math.round(utilization * 100)}% of what you're paying for. ` +
          `Within your SAR ${budgetSAR} budget, these plans still cover your usage.`,
      };
    }
    const fallback = largestUnderBudget();
    return {
      plans: fallback,
      diagnosis: "no-match",
      headline: `No cheaper plan fully covers ${usageGB.toFixed(1)} GB`,
      reasoning:
        `You used ${usageGB.toFixed(1)} GB on ${currentPlan.planName} — only ` +
        `${Math.round(utilization * 100)}% of your allowance. ` +
        (fallback.length > 0
          ? `Nothing within SAR ${budgetSAR} covers that with buffer, but these are the largest ` +
            `plans we can offer for your budget.`
          : `Nothing within SAR ${budgetSAR} fits — try raising your budget.`),
    };
  }

  // Under-served (≥90%) — need meaningfully more data
  if (utilization >= 0.9) {
    const plans = takeTop(
      (p) => withinBudget(p) && parsePlanData(p.dataGB) >= currentDataGB * 1.5,
      (a, b) => parsePlanData(b.dataGB) - parsePlanData(a.dataGB) || a.priceSAR - b.priceSAR,
      3,
      currentPlan.id,
    );
    if (plans.length > 0) {
      return {
        plans,
        diagnosis: "under-served",
        headline: `You need more data`,
        reasoning:
          `You used ${usageGB.toFixed(1)} GB but your ${currentPlan.planName} only includes ` +
          `${currentPlan.dataGB} GB — you're right at your cap. Within SAR ${budgetSAR}, ` +
          `these plans give you significantly more data.`,
      };
    }
    const fallback = largestUnderBudget();
    return {
      plans: fallback,
      diagnosis: "no-match",
      headline: `Nothing within SAR ${budgetSAR} offers meaningfully more data`,
      reasoning:
        `You used ${usageGB.toFixed(1)} GB on your ${currentPlan.dataGB} GB plan — ` +
        `you need a bigger plan. ` +
        (fallback.length > 0
          ? `These are the largest plans we can offer for your budget, but you may need to raise it.`
          : `Try raising your budget to see better options.`),
    };
  }

  // Good-fit (60–90%) — look for cheaper alternatives that still cover usage
  const plans = takeTop(
    (p) => withinBudget(p) && parsePlanData(p.dataGB) >= neededGB,
    (a, b) => a.priceSAR - b.priceSAR,
    3,
    currentPlan.id,
  );
  const saving = plans.length > 0 ? currentPlan.priceSAR - plans[0].priceSAR : 0;
  if (plans.length > 0 && saving > 0) {
    return {
      plans,
      diagnosis: "good-fit",
      headline: `Your plan fits — but you could save SAR ${saving.toFixed(0)}/month`,
      reasoning:
        `Your ${currentPlan.planName} matches your ${usageGB.toFixed(1)} GB usage ` +
        `(${Math.round(utilization * 100)}% used). Within your SAR ${budgetSAR} budget, ` +
        `these alternatives cover your needs for less.`,
    };
  }
  if (plans.length > 0) {
    return {
      plans,
      diagnosis: "good-fit",
      headline: `Alternatives that match your usage`,
      reasoning:
        `Your ${currentPlan.planName} matches your ${usageGB.toFixed(1)} GB usage. ` +
        `These are other plans within SAR ${budgetSAR} with similar coverage.`,
    };
  }
  return {
    plans: [],
    diagnosis: "good-fit",
    headline: `You're on a good plan`,
    reasoning:
      `Your ${currentPlan.planName} matches your ${usageGB.toFixed(1)} GB usage ` +
      `and nothing within SAR ${budgetSAR} beats it — you're already on a solid deal.`,
  };
}

/**
 * Main entry: analyze a screenshot + budget → return extracted usage + recommended plan.
 * `currentPlan` is an optional free-text description of what the user pays for today
 * (e.g. "STC Quicknet · SAR 150"); when provided it's echoed back in the reasoning so
 * the frontend can compare against it.
 */
export async function analyzeUsageAndMatch(
  imageDataUrl: string | undefined,
  budgetSAR: number,
  currentPlanId?: number,
): Promise<LabMatch> {
  const usage = imageDataUrl
    ? await extractUsageFromImage(imageDataUrl)
    : { totalGB: 0, confidence: "low" as const, notes: "" };

  const currentPlan = currentPlanId
    ? PLANS_DATA.find((p) => p.id === currentPlanId)
    : undefined;

  const { plans, diagnosis, headline, reasoning } = analyzeAndPick(
    usage.totalGB,
    budgetSAR,
    currentPlan,
  );

  return { usage, plans, diagnosis, headline, reasoning };
}
