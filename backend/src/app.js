import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import deliveriesRoutes from "../routes/deliveries.routes.js";
import routesRoutes from "../routes/routes.routes.js";
import authRoutes from "../routes/auth.routes.js";
import auditRoutes from "../routes/audit.routes.js";
import driversRoutes from "../routes/drivers.routes.js";
import vehicleChecksRoutes from "../routes/vehicle-checks.routes.js";
import openApiDocument from "../docs/openapi.js";

const app = express();
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) || defaultOrigins;

app.use(cors({
	origin(origin, callback) {
		if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
		return callback(new Error("Origen no permitido por CORS"));
	},
}));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/openapi.json", (_req, res) => res.json(openApiDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: "VGV Connect API" }));

app.use("/deliveries", deliveriesRoutes);
app.use("/routes", routesRoutes);
app.use("/auth", authRoutes);
app.use("/audit", auditRoutes);
app.use("/drivers", driversRoutes);
app.use("/vehicle-checks", vehicleChecksRoutes);

export default app;
