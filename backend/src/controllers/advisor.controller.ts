import type { Request, Response } from "express";
import * as AdvisorService from "../services/advisor.service.js";
import type { ChatMessage } from "../types.js";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { lang, history, userMessage, segment } = req.body as {
      lang: "en" | "ar";
      history: ChatMessage[];
      userMessage: string;
      segment?: string;
    };

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

    const result = await AdvisorService.getAdvisorReply(lang ?? "en", history, userMessage, segment);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "OPENAI_API_KEY is not set") {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }
    console.error("Advisor message error:", err);
    res.status(500).json({ error: "Failed to send advisor message" });
  }
};
