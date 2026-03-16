import { Router } from "express";
import * as AdvisorController from "../controllers/advisor.controller.js";

const router = Router();

router.post("/message", AdvisorController.sendMessage);

export default router;
