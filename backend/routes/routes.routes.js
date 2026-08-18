import { Router } from "express";
import {
	createRoute,
	getRoutes,
	optimizeRoute,
	updateRoute,
} from "../controllers/routes.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getRoutes);
router.post("/", requireAuth, requireRole("admin"), createRoute);
router.put("/:id", requireAuth, requireRole("admin"), updateRoute);
router.post("/:id/optimize", requireAuth, requireRole("admin"), optimizeRoute);

export default router;