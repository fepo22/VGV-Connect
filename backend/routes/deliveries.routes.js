import { Router } from "express";
import { getDeliveries, updateDeliveryStatus } from "../controllers/deliveries.controller.js";

const router = Router();

router.get("/", getDeliveries);
router.put("/:id/status", updateDeliveryStatus);

export default router;
