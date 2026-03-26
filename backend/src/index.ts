/**
 * Entry point for the SimbaApp Express backend server.
 *
 * This server provides REST APIs for:
 *  - Browsing & searching Saudi telecom plans (150+ plans, 8 carriers)
 *  - User interactions (likes, dislikes, comments) stored in Firestore
 *  - AI-powered plan advisor (OpenAI GPT integration)
 *  - User persona/segment system for personalized recommendations
 */

import express from "express";
import cors from "cors";
import compression from "compression";       // Gzip responses for faster transfers
import rateLimit from "express-rate-limit";   // Prevent abuse on expensive endpoints
import dotenv from "dotenv";

// Load environment variables from .env file (must run before importing modules that use env vars)
dotenv.config();

// Route modules — each maps URL paths to their respective controllers
import plansRouter from "./routes/plans.routes.js";
import advisorRouter from "./routes/advisor.routes.js";
import interactionsRouter from "./routes/interactions.routes.js";
import personaRouter from "./routes/persona.routes.js";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS whitelist: allow Vite dev servers + production URL
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  process.env.PRODUCTION_URL,        // Set in production to allow the deployed frontend
].filter(Boolean) as string[];

if (process.env.NODE_ENV === "production" && !process.env.PRODUCTION_URL) {
  console.warn("WARNING: PRODUCTION_URL is not set. CORS will only allow localhost.");
}

// ── Global Middleware ──
app.use(compression());                       // Compress all HTTP responses
app.use(cors({ origin: allowedOrigins }));    // Restrict cross-origin requests to known frontends
app.use(express.json({ limit: "1mb" }));      // Parse JSON bodies, cap at 1MB to prevent abuse

// Rate limiter for the AI advisor
const advisorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1-minute sliding window
  max: 10,             // Max 10 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// ── Routes ──

// Simple health check for uptime monitoring (e.g., Production health checks)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Plan browsing & search — serves in-memory plan data (no DB hit)
app.use("/api/plans", plansRouter);

// User interactions — likes, dislikes, comments (Firestore-backed)
app.use("/api/plan-interactions", interactionsRouter);

// AI advisor chat — rate-limited because each request calls OpenAI
app.use("/api/advisor", advisorLimiter, advisorRouter);

// User persona & segment system — personalized plan recommendations
app.use("/api/persona", personaRouter);

// ── Error Handling ──

// Global error-handling middleware — catches any unhandled errors thrown in route handlers.
// Must be registered AFTER all routes (Express identifies error middleware by its 4-param signature).
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

// Safety nets for unhandled async errors — log them so they don't silently disappear
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// Uncaught synchronous exceptions are fatal — log and exit so the process manager can restart
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
