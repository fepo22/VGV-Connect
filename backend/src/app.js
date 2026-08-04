import express from "express";
import cors from "cors";
import deliveriesRoutes from "../routes/deliveries.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/deliveries", deliveriesRoutes);

export default app;
