import { Router } from "express";
import { getDeliveries, updateDeliveryStatus, uploadDeliveryPhoto } from "../controllers/deliveries.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { requireSession } from "../middleware/session.middleware.js";
import { getDriverAuditLogs } from "../controllers/audit.controller.js";

const router = Router();

router.get("/", requireSession, getDeliveries);
router.get("/history", requireSession, requireRole("driver"), getDriverAuditLogs);
router.put("/:id/status", requireSession, requireRole("driver", "admin"), updateDeliveryStatus);
router.post("/:id/photo", requireSession, requireRole("driver", "admin"), uploadDeliveryPhoto);

export default router;
