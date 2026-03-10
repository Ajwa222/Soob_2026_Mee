import { Router } from "express";
import OpenAI from "openai";
import { PLANS_DATA } from "../data/plans.js";
import type { Plan, ChatMessage } from "../types.js";

const router = Router();

const VALID_LANGS: Set<string> = new Set(["en", "ar"]);

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
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

let _plansContext: string | null = null;
function buildPlansContext(): string {
  if (!_plansContext) {
    _plansContext = PLANS_DATA.map(planToRow).join("\n");
  }
  return _plansContext;
}

function buildSystemPrompt(lang: "en" | "ar"): string {
  return `You are Simba, a friendly Saudi telecom plan advisor.

ROLE:
- Help the user find the best mobile plan from the catalog below.
- Start by understanding the user's needs through natural conversation. Ask about:
  • How much mobile data they use (light browsing, heavy streaming, etc.)
  • Whether they need local call minutes and how many
  • Whether they make international calls
  • If they need dedicated social media data
  • Their monthly budget in SAR
- Once you understand their needs, recommend your top 3 plans. Briefly explain why each plan fits.
- Keep asking follow-up questions to refine recommendations if the user isn't satisfied.
- Keep answers concise (under 200 words). Use bullet points for plan comparisons.

RULES:
- ONLY recommend plans from the catalog below. Never invent plans.
- CRITICAL: Every time you mention a plan, you MUST include its ID like [#ID] (e.g. [#5]) in the text. The app uses these IDs to show interactive plan cards. Never mention a plan without its [#ID] tag.
- If the user asks about something outside telecom plans, politely redirect.
- Respond in ${lang === "ar" ? "Arabic (Saudi dialect preferred)" : "English"}.
- Never mention that you are an AI or LLM. You are "Simba, your plan advisor".
- Prices include 15% VAT already.
- If the user gives you enough info upfront (e.g. budget + needs), skip extra questions and recommend plans directly.

PLAN CATALOG:
${buildPlansContext()}`;
}

function extractPlanIds(text: string): number[] {
  const matches = text.matchAll(/\[#(\d+)\]/g);
  const ids = [...matches].map((m) => parseInt(m[1], 10));
  const validIds = PLANS_DATA.map((p) => p.id);
  return [...new Set(ids)].filter((id) => validIds.includes(id));
}

/** POST /api/advisor/message — send a message to the advisor */
router.post("/message", async (req, res) => {
  try {
    const { lang, history, userMessage } = req.body as {
      lang: "en" | "ar";
      history: ChatMessage[];
      userMessage: string;
    };

    if (!userMessage) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    if (lang && !VALID_LANGS.has(lang)) {
      res.status(400).json({ error: "lang must be 'en' or 'ar'" });
      return;
    }

    if (typeof userMessage !== "string" || userMessage.length > 1000) {
      res
        .status(400)
        .json({ error: "userMessage must be a string under 1000 characters" });
      return;
    }

    let client: OpenAI;
    try {
      client = getClient();
    } catch {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }
    const systemPrompt = buildSystemPrompt(lang ?? "en");

    // Cap history to last 20 messages to limit token usage
    const trimmedHistory = (history ?? []).slice(-20);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory.map((msg) => ({
        role:
          msg.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content: msg.text,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
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
