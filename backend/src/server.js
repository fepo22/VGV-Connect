import app from "./app.js";
import dotenv from "dotenv";
import { ensureDemoUsers } from "../services/bootstrap-users.service.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

await ensureDemoUsers();

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
