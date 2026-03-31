/**
 * Advisor service — AI-powered plan recommendation chatbot using OpenAI.
 *
 * How it works:
 *  1. Builds a system prompt containing the full plan catalog (154 plans as pipe-delimited rows)
 *  2. Sends the conversation history + new message to OpenAI GPT
 *  3. Extracts plan IDs from function tool calls so the frontend can render plan cards
 *
 * The AI calls a `recommend_plans` tool with plan IDs whenever it mentions plans —
 * this is how the frontend knows which plan cards to show inline in the chat.
 */

import OpenAI from "openai";
import { PLANS_DATA } from "../data/plans.js";
import type { Plan, ChatMessage } from "../types.js";

const VALID_LANGS: Set<string> = new Set(["en", "ar"]);

// Lazy-initialized OpenAI client (created on first use so we fail fast if API key is missing)
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

/**
 * Converts a Plan object into a compact pipe-delimited row for the system prompt.
 * Example: "#5 | STC | Plan Pro | Postpaid | 150 SAR | Data:50GB | ..."
 */
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

// Lazy-built plan catalog text — all 154 plans as rows, cached after first call
let _plansContext: string | null = null;
function buildPlansContext(): string {
  if (!_plansContext) {
    _plansContext = PLANS_DATA.map(planToRow).join("\n");
  }
  return _plansContext;
}

/** Builds the full system prompt: role instructions + entire plan catalog */
function buildSystemPrompt(lang: "en" | "ar"): string {
  return `You are Simba, a friendly Saudi telecom plan advisor.

ROLE:
- Help the user find the best mobile plan from the catalog below.
- Have a natural, dynamic conversation to understand their needs. Adapt your questions based on their responses — do NOT follow a fixed script.
- You MUST gather these 5 pieces of info before recommending plans:
  1. Internet usage — how often/heavily they use mobile internet (a lot, sometimes, or not at all)
  2. Local calls — whether they need local call minutes (a lot, some, or none)
  3. International calls — whether they make international calls (yes or no)
  4. Social media data — whether dedicated social media data matters to them (yes or no)
  5. Monthly budget in SAR
- When the user describes their needs in one message, check which of the 5 items they covered. If any are missing, ask ONLY about the missing ones in a short follow-up (e.g. "Got it! Just need to know — do you make international calls? And is social media data important to you?").
- If all 5 are covered, recommend plans immediately — do not ask unnecessary questions.
- Ask ONE or TWO questions at a time, not all five. Pick the most relevant follow-up based on what the user already told you.
- Once you understand their needs, recommend your top 3 plans. Briefly explain why each plan fits.
- Keep asking follow-up questions to refine recommendations if the user isn't satisfied.

FORMATTING:
- Keep answers concise (under 200 words).
- Use **bold** for emphasis on key details (plan names, prices, data amounts).
- Use bullet points for plan comparisons.
- Do NOT use markdown headers (#).

RULES:
- ONLY recommend plans from the catalog below. Never invent plans.
- When you mention or recommend plans, call the recommend_plans tool with their IDs. The app uses those IDs to show interactive plan cards.
- If the user asks about something outside telecom plans, politely redirect.
- Respond in ${lang === "ar" ? "Arabic (Saudi dialect preferred)" : "English"}.
- Never mention that you are an AI or LLM. You are "Simba, your plan advisor".
- Prices include 15% VAT already.

PLAN CATALOG:
${buildPlansContext()}`;
}

/** Valid plan IDs from the catalog, used to filter hallucinated IDs */
const VALID_PLAN_IDS = new Set(PLANS_DATA.map((p) => p.id));

/** OpenAI tool definition — the model calls this to report which plans it's recommending */
const RECOMMEND_PLANS_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "recommend_plans",
    description:
      "Call this whenever you mention or recommend plans. Provide the plan IDs so the app can display interactive plan cards.",
    parameters: {
      type: "object",
      properties: {
        plan_ids: {
          type: "array",
          items: { type: "number" },
          description: "Array of plan IDs being recommended (e.g. [5, 42, 103])",
        },
      },
      required: ["plan_ids"],
    },
  },
};

/**
 * Extracts plan IDs from the model's tool calls.
 * Only returns IDs that exist in the plan catalog (filters out hallucinated IDs).
 */
function extractPlanIds(
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined,
): number[] {
  if (!toolCalls) return [];
  const ids: number[] = [];
  for (const call of toolCalls) {
    if (call.type !== "function") continue;
    if (call.function.name === "recommend_plans") {
      try {
        const args = JSON.parse(call.function.arguments);
        if (Array.isArray(args.plan_ids)) {
          ids.push(...args.plan_ids.map(Number).filter((id: number) => !isNaN(id)));
        }
      } catch {
        // Malformed JSON — skip this tool call
      }
    }
  }
  return [...new Set(ids)].filter((id) => VALID_PLAN_IDS.has(id));
}

/** Validates that a language code is supported (English or Arabic) */
export function isValidLang(lang: string): boolean {
  return VALID_LANGS.has(lang);
}

/**
 * Main entry point: sends a message to the AI advisor and returns the reply.
 *
 * @param lang - Response language ("en" or "ar")
 * @param history - Previous conversation messages (trimmed to last 20 to stay within token limits)
 * @param userMessage - The user's new message
 * @returns { reply: string, planIds: number[] } — the AI's text reply and any plan IDs it referenced
 */
export async function getAdvisorReply(
  lang: "en" | "ar",
  history: ChatMessage[],
  userMessage: string,
): Promise<{ reply: string; planIds: number[] }> {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(lang ?? "en");

  // Keep only the last 20 messages to avoid exceeding OpenAI's context window
  const trimmedHistory = (history ?? []).slice(-20);

  // Build the OpenAI messages array: system prompt → conversation history → new user message
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory.map((msg) => ({
      role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: msg.text,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
    messages,
    tools: [RECOMMEND_PLANS_TOOL],
    tool_choice: "auto",
  });

  const message = response.choices[0]?.message;
  const reply = message?.content ?? "";
  // Extract plan IDs from tool calls so the frontend can render interactive plan cards
  const planIds = extractPlanIds(message?.tool_calls);

  return { reply, planIds };
}
