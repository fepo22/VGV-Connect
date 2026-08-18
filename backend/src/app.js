import express from "express";
import cors from "cors";
import deliveriesRoutes from "../routes/deliveries.routes.js";
import routesRoutes from "../routes/routes.routes.js";
import authRoutes from "../routes/auth.routes.js";
import auditRoutes from "../routes/audit.routes.js";
import driversRoutes from "../routes/drivers.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/deliveries", deliveriesRoutes);
app.use("/routes", routesRoutes);
app.use("/auth", authRoutes);
app.use("/audit", auditRoutes);
app.use("/drivers", driversRoutes);

export default app;
