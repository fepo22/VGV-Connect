import express from "express";
import cors from "cors";
import deliveriesRoutes from "../routes/deliveries.routes.js";
import routesRoutes from "../routes/routes.routes.js";
import authRoutes from "../routes/auth.routes.js";
import auditRoutes from "../routes/audit.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/deliveries", deliveriesRoutes);
app.use("/routes", routesRoutes);
app.use("/auth", authRoutes);
app.use("/audit", auditRoutes);

export default app;
