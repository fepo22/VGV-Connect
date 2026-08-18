import { Router } from "express";
import { getDeliveries, updateDeliveryStatus, uploadDeliveryPhoto } from "../controllers/deliveries.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getDeliveries);
router.put("/:id/status", requireAuth, requireRole("driver", "admin"), updateDeliveryStatus);
router.post("/:id/photo", requireAuth, requireRole("driver", "admin"), uploadDeliveryPhoto);

export default router;
