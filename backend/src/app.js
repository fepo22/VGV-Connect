import express from "express";
import cors from "cors";
import deliveriesRoutes from "../routes/deliveries.routes.js";
import clientsRoutes from "../routes/clients.routes.js";
import driversRoutes from "../routes/drivers.routes.js";
import vehiclesRoutes from "../routes/vehicles.routes.js";
import ordersRoutes from "../routes/orders.routes.js";
import routesRoutes from "../routes/routes.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/deliveries", deliveriesRoutes);
app.use("/clients", clientsRoutes);
app.use("/drivers", driversRoutes);
app.use("/vehicles", vehiclesRoutes);
app.use("/orders", ordersRoutes);
app.use("/routes", routesRoutes);

export default app;
