import express from "express";
import cors from "cors";
import deliveriesRoutes from "./routes/deliveries.routes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/deliveries", deliveriesRoutes);

// Servidor
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
