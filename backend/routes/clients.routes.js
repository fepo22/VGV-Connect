import { Router } from "express";
import { getClients, createClient, getClientAddresses, createClientAddress } from "../controllers/clients.controller.js";

const router = Router();

router.get("/", getClients);
router.post("/", createClient);
router.get("/:id/addresses", getClientAddresses);
router.post("/:id/addresses", createClientAddress);

export default router;
