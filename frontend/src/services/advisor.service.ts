/**
 * Advisor service — sends messages to the AI plan advisor and resolves plan references.
 *
 * The advisor endpoint (POST /api/advisor/message) requires authentication.
 * The backend forwards the conversation to OpenAI GPT-4 mini, which returns
 * a text reply and any plan IDs it referenced (extracted via function calling).
 */
import { apiFetch } from "./apiClient";
import type { Plan } from "../types";

/** A single message in the advisor conversation history. */
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  planIds?: number[];              // Plan IDs referenced in this message (assistant only)
}

/**
 * POST /api/advisor/message — Send a user message and get an AI reply.
 *
 * @param lang        - Response language ("en" or "ar")
 * @param history     - Previous conversation messages for context
 * @param userMessage - The user's new message
 * @returns { reply, planIds } — AI text reply + referenced plan IDs
 */
export const sendAdvisorMessage = async (
  lang: "en" | "ar",
  history: ChatMessage[],
  userMessage: string,
): Promise<{ reply: string; planIds: number[] }> => {
  return apiFetch<{ reply: string; planIds: number[] }>("/api/advisor/message", {
    method: "POST",
    body: JSON.stringify({ lang, history, userMessage }),
  });
};

/**
 * Look up Plan objects by their IDs from the in-memory plan catalog.
 * Used to render plan cards inline in advisor chat messages.
 */
export function getPlansById(allPlans: Plan[], ids: number[]): Plan[] {
  return ids.map(id => allPlans.find(p => p.id === id)).filter(Boolean) as Plan[];
}
