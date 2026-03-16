import { Router } from "express";
import * as PlansController from "../controllers/plans.controller.js";

const router = Router();

router.get("/cards", PlansController.getCards);
router.get("/personalized", PlansController.getPersonalized);
router.get("/", PlansController.getAll);
router.get("/:id", PlansController.getById);

export default router;
