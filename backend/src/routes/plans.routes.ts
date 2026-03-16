import { Router } from "express";
import * as PlansController from "../controllers/plans.controller.js";
import { cacheJson } from "../middleware/cache.js";

const router = Router();

router.get("/cards", cacheJson(), PlansController.getCards);
router.get("/personalized", cacheJson(), PlansController.getPersonalized);
router.get("/", cacheJson(), PlansController.getAll);
router.get("/:id", PlansController.getById);

export default router;
