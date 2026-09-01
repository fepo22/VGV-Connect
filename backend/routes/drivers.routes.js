import { Router } from "express";
import { createDriver, deleteDriver, getDrivers, getDriversOverview, updateDriver } from "../controllers/drivers.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/overview", requireAuth, requireRole("admin", "route_planner"), getDriversOverview);
router.get("/", requireAuth, requireRole("admin"), getDrivers);
router.post("/", requireAuth, requireRole("admin"), createDriver);
router.put("/:id", requireAuth, requireRole("admin"), updateDriver);
router.delete("/:id", requireAuth, requireRole("admin"), deleteDriver);

export default router;
