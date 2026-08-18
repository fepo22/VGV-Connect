import { Router } from "express";
import {
	createRoute,
	getRoutes,
	getRoute,
	optimizeRoute,
	deleteRoute,
	updateRoute,
} from "../controllers/routes.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getRoutes);
router.post("/", requireAuth, requireRole("admin", "route_planner"), createRoute);
router.get("/:id", requireAuth, getRoute);
router.put("/:id", requireAuth, requireRole("admin", "route_planner"), updateRoute);
router.delete("/:id", requireAuth, requireRole("admin", "route_planner"), deleteRoute);
router.post("/:id/optimize", requireAuth, requireRole("admin", "route_planner"), optimizeRoute);

export default router;