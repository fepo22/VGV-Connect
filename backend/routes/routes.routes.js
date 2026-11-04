import { Router } from "express";
import {
	createRoute,
	getRoutes,
	getRoute,
	optimizeRoute,
	deleteRoute,
	updateRoute,
} from "../controllers/routes.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { requireSession } from "../middleware/session.middleware.js";

const router = Router();

router.get("/", requireSession, getRoutes);
router.post("/", requireSession, requireRole("admin", "route_planner"), createRoute);
router.get("/:id", requireSession, getRoute);
router.put("/:id", requireSession, requireRole("admin", "route_planner"), updateRoute);
router.delete("/:id", requireSession, requireRole("admin", "route_planner"), deleteRoute);
router.post("/:id/optimize", requireSession, requireRole("admin", "route_planner"), optimizeRoute);

export default router;