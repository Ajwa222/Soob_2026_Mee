/**
 * Advisor routes — AI-powered telecom plan recommendation chatbot.
 * Uses OpenAI GPT with the full plan catalog in the system prompt.
 * Rate-limited to 10 req/min per IP (applied in index.ts).
 *
 * Mounted at: /api/advisor
 */

import { Router } from "express";
import * as AdvisorController from "../controllers/advisor.controller.js";

const router = Router();

// POST /api/advisor/message — Send a message to the AI advisor and get a reply
// Body: { lang: "en"|"ar", history: ChatMessage[], userMessage: string, segment?: string }
// Returns: { reply: string, planIds: number[] }
router.post("/message", AdvisorController.sendMessage);

export default router;
