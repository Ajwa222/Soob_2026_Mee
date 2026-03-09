import { Router } from "express";
import OpenAI from "openai";
import { PLANS_DATA } from "../data/plans.js";
import type { Plan, Priority, ChatMessage } from "../types.js";

const router = Router();

const VALID_PRIORITIES: Set<string> = new Set([
  "unlimited_data", "cheap_price", "international_calls", "social_media",
  "five_g", "no_contract", "local_calls", "roaming",
]);

const VALID_LANGS: Set<string> = new Set(["en", "ar"]);

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function planToRow(p: Plan): string {
  return [
    `#${p.id}`,
    p.provider,
    p.planName,
    p.planType,
    `${p.priceSAR} SAR`,
    `Data:${p.dataGB}GB`,
    `Social:${p.socialMediaData}`,
    `LocalMin:${p.localCallMinutes}`,
    `IntlMin:${p.internationalCallMinutes}`,
    `SMS:${p.sms}`,
    p.specialFeatures && p.specialFeatures !== "-" ? p.specialFeatures : "",
    p.contractTerms,
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildPlansContext(): string {
  return PLANS_DATA.map(planToRow).join("\n");
}

function buildSystemPrompt(priorities: Priority[], lang: "en" | "ar"): string {
  const priorityLabels: Record<Priority, string> = {
    unlimited_data: "Unlimited / large data",
    cheap_price: "Cheapest price",
    international_calls: "International calling",
    social_media: "Social media data",
    five_g: "5G support",
    no_contract: "No contract / flexibility",
    local_calls: "Lots of local call minutes",
    roaming: "Roaming support",
  };

  const picked = priorities.map((p) => priorityLabels[p]).join(", ");

  return `You are Simba, a friendly Saudi telecom plan advisor.

ROLE:
- Help the user find the best mobile plan from the catalog below.
- The user's top priorities are: ${picked}.
- Start by recommending your top 3 plans based on their priorities. Briefly explain why each plan fits.
- Then invite the user to ask follow-up questions (e.g. budget, specific carrier preference, more details).
- Keep answers concise (under 200 words). Use bullet points for plan comparisons.

RULES:
- ONLY recommend plans from the catalog below. Never invent plans.
- When you mention a plan, always include its ID like [#ID] so the app can show the plan card.
- If the user asks about something outside telecom plans, politely redirect.
- Respond in ${lang === "ar" ? "Arabic (Saudi dialect preferred)" : "English"}.
- Never mention that you are an AI or LLM. You are "Simba, your plan advisor".
- Prices include 15% VAT already.

PLAN CATALOG:
${buildPlansContext()}`;
}

function extractPlanIds(text: string): number[] {
  const matches = text.matchAll(/\[#(\d+)\]/g);
  const ids = [...matches].map((m) => parseInt(m[1], 10));
  const validIds = PLANS_DATA.map((p) => p.id);
  return [...new Set(ids)].filter((id) => validIds.includes(id));
}

/** POST /api/advisor/start — start a new advisor chat */
router.post("/start", async (req, res) => {
  try {
    const { priorities, lang } = req.body as {
      priorities: Priority[];
      lang: "en" | "ar";
    };

    if (!Array.isArray(priorities) || priorities.length === 0) {
      res.status(400).json({ error: "priorities must be a non-empty array" });
      return;
    }

    if (priorities.some((p) => !VALID_PRIORITIES.has(p))) {
      res.status(400).json({ error: "Invalid priority value" });
      return;
    }

    if (lang && !VALID_LANGS.has(lang)) {
      res.status(400).json({ error: "lang must be 'en' or 'ar'" });
      return;
    }

    let client: OpenAI;
    try {
      client = getClient();
    } catch {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }
    const systemPrompt = buildSystemPrompt(priorities, lang ?? "en");

    const firstUserMessage =
      lang === "ar"
        ? "مرحبا! ابي تساعدني ألقى أفضل باقة جوال تناسبني."
        : "Hi! Help me find the best mobile plan for my needs.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: firstUserMessage },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? "";
    const planIds = extractPlanIds(reply);

    res.json({ reply, planIds });
  } catch (err) {
    console.error("Advisor start error:", err);
    res.status(500).json({ error: "Failed to start advisor chat" });
  }
});

/** POST /api/advisor/message — send a follow-up message */
router.post("/message", async (req, res) => {
  try {
    const { priorities, lang, history, userMessage } = req.body as {
      priorities: Priority[];
      lang: "en" | "ar";
      history: ChatMessage[];
      userMessage: string;
    };

    if (!Array.isArray(priorities) || priorities.length === 0 || !userMessage) {
      res
        .status(400)
        .json({ error: "priorities and userMessage are required" });
      return;
    }

    if (priorities.some((p) => !VALID_PRIORITIES.has(p))) {
      res.status(400).json({ error: "Invalid priority value" });
      return;
    }

    if (lang && !VALID_LANGS.has(lang)) {
      res.status(400).json({ error: "lang must be 'en' or 'ar'" });
      return;
    }

    if (typeof userMessage !== "string" || userMessage.length > 1000) {
      res.status(400).json({ error: "userMessage must be a string under 1000 characters" });
      return;
    }

    let client: OpenAI;
    try {
      client = getClient();
    } catch {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }
    const systemPrompt = buildSystemPrompt(priorities, lang ?? "en");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((msg) => ({
        role:
          msg.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content: msg.text,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const reply = response.choices[0]?.message?.content ?? "";
    const planIds = extractPlanIds(reply);

    res.json({ reply, planIds });
  } catch (err) {
    console.error("Advisor message error:", err);
    res.status(500).json({ error: "Failed to send advisor message" });
  }
});

export default router;
