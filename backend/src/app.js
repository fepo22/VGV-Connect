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
import { errorHandler } from "../middleware/error-handler.middleware.js";

const app = express();
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) || defaultOrigins;
const trustProxy = process.env.TRUST_PROXY?.trim();

// Necesario detrás de un proxy (p. ej. Railway) para que el límite de login use la IP real del cliente.
if (trustProxy && trustProxy !== "false") app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy.split(",").map((value) => value.trim()));

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

app.use(errorHandler);

export default app;
