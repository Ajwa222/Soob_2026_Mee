/**
 * Advisor controller — handles the AI chatbot endpoint.
 *
 * The frontend sends the conversation history + new message, and this
 * controller validates the input, forwards it to the advisor service
 * (which calls OpenAI), and returns the AI reply with extracted plan IDs.
 */

import type { Request, Response } from "express";
import * as AdvisorService from "../services/advisor.service.js";
import type { ChatMessage } from "../types.js";

/**
 * POST /api/advisor/message
 *
 * Request body:
 *   - lang: "en" | "ar" — response language (defaults to "en")
 *   - history: ChatMessage[] — previous conversation messages for context
 *   - userMessage: string — the user's new message (max 1000 chars)
 *
 * Response: { reply: string, planIds: number[] }
 *   - reply: the AI advisor's response text
 *   - planIds: plan IDs extracted from [#ID] tags in the reply (used by frontend to render plan cards)
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { lang, history, userMessage } = req.body as {
      lang: "en" | "ar";
      history: ChatMessage[];
      userMessage: string;
    };

    // Input validation
    if (!userMessage) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }
    if (lang && !AdvisorService.isValidLang(lang)) {
      res.status(400).json({ error: "lang must be 'en' or 'ar'" });
      return;
    }
    if (typeof userMessage !== "string" || userMessage.length > 1000) {
      res.status(400).json({ error: "userMessage must be a string under 1000 characters" });
      return;
    }

    const result = await AdvisorService.getAdvisorReply(lang ?? "en", history, userMessage);
    res.json(result);
  } catch (err: unknown) {
    // Special handling: surface a clear error if OpenAI API key isn't configured
    if (err instanceof Error && err.message === "OPENAI_API_KEY is not set") {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }
    console.error("Advisor message error:", err);
    res.status(500).json({ error: "Failed to send advisor message" });
  }
};
