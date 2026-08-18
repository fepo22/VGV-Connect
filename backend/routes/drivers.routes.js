import { Router } from "express";
import { getDriversOverview } from "../controllers/drivers.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/overview", requireAuth, requireRole("admin", "route_planner"), getDriversOverview);

export default router;
