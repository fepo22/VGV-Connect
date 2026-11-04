import { Router } from "express";
import { createDriver, deleteDriver, getDrivers, getDriversOverview, resetDriverPassword, updateDriver } from "../controllers/drivers.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { requireSession } from "../middleware/session.middleware.js";

const router = Router();

router.get("/overview", requireSession, requireRole("admin", "route_planner"), getDriversOverview);
router.get("/", requireSession, requireRole("admin"), getDrivers);
router.post("/", requireSession, requireRole("admin"), createDriver);
router.put("/:id", requireSession, requireRole("admin"), updateDriver);
router.post("/:id/reset-password", requireSession, requireRole("admin"), resetDriverPassword);
router.delete("/:id", requireSession, requireRole("admin"), deleteDriver);

export default router;
