import { Router } from "express";

const router = Router();

// Minimal routes endpoint — return orders for now
router.get('/', (req, res) => {
  res.json({ message: 'routes endpoint: use /orders for scheduled orders' });
});

export default router;
