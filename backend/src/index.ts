import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

import plansRouter from "./routes/plans.js";
import advisorRouter from "./routes/advisor.js";
import interactionsRouter from "./routes/interactions.js";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.PRODUCTION_URL,
].filter(Boolean) as string[];

if (process.env.NODE_ENV === "production" && !process.env.PRODUCTION_URL) {
  console.warn("WARNING: PRODUCTION_URL is not set. CORS will only allow localhost.");
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Rate limiting for AI advisor endpoints (expensive OpenAI calls)
const advisorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Rate limiting for interaction endpoints (reactions/comments)
const interactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes — interactions before plans so /:id/reactions matches before /:id
app.use("/api/plans", interactionLimiter, interactionsRouter);
app.use("/api/plans", plansRouter);
app.use("/api/advisor", advisorLimiter, advisorRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
