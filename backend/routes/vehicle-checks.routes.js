import { Router } from "express";
import { getVehicleChecks, saveVehicleCheck } from "../controllers/vehicle-checks.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, requireRole("driver", "admin"), getVehicleChecks);
router.post("/", requireAuth, requireRole("driver", "admin"), saveVehicleCheck);

export default router;