import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { requireSession } from "../middleware/session.middleware.js";

const router = Router();

router.get("/", requireSession, requireRole("admin"), getAuditLogs);

export default router;