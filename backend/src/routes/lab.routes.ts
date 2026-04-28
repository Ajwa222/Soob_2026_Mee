import { Router } from "express";
import { analyzeUsage } from "../controllers/lab.controller.js";

const router = Router();

router.post("/analyze-usage", analyzeUsage);

export default router;
