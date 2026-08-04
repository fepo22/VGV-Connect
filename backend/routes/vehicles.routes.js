import { Router } from "express";
import { getVehicles } from "../controllers/vehicles.controller.js";

const router = Router();

router.get("/", getVehicles);

export default router;
