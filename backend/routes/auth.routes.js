import { Router } from "express";
import { login } from "../controllers/auth.controller.js";
import { changePassword } from "../controllers/password.controller.js";
import { loginRateLimit } from "../middleware/login-rate-limit.middleware.js";
import { requireValidSession } from "../middleware/session.middleware.js";

const router = Router();

router.post("/login", loginRateLimit, login);
router.post("/change-password", requireValidSession, changePassword);

export default router;