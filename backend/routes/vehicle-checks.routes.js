import { Router } from "express";
import { getVehicleChecks, saveVehicleCheck } from "../controllers/vehicle-checks.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { requireSession } from "../middleware/session.middleware.js";

const router = Router();

router.get("/", requireSession, requireRole("driver", "admin"), getVehicleChecks);
router.post("/", requireSession, requireRole("driver", "admin"), saveVehicleCheck);

export default router;