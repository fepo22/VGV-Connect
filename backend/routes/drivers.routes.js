import { Router } from "express";
import { getDrivers, getDriverOrders } from "../controllers/drivers.controller.js";

const router = Router();

router.get("/", getDrivers);
router.get("/:id/orders", getDriverOrders);

export default router;
