import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), getAuditLogs);

export default router;