import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import plansRouter from "./routes/plans.js";
import advisorRouter from "./routes/advisor.js";
import interactionsRouter from "./routes/interactions.js";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "http://localhost:5173",
  process.env.PRODUCTION_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes — interactions before plans so /:id/reactions matches before /:id
app.use("/api/plans", interactionsRouter);
app.use("/api/plans", plansRouter);
app.use("/api/advisor", advisorRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
