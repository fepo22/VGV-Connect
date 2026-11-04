import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { signUserToken } from "../middleware/auth.middleware.js";

let dummyHash;
const getDummyHash = () => (dummyHash ||= bcrypt.hash(`${Date.now()}:${Math.random()}`, 10));

export const login = async (req, res) => {
  const key = String(req.body?.identifier || "").trim();
  const user = await prisma.user.findFirst({ where: { username: { equals: key, mode: "insensitive" } } });
  // Se compara también cuando el usuario no existe para que el tiempo de respuesta no revele cuentas válidas.
  const passwordMatches = await bcrypt.compare(String(req.body?.password ?? ""), user?.passwordHash || await getDummyHash());
  if (!user || !passwordMatches) {
    return res.status(400).json({ message: "Credenciales inválidas" });
  }
  const publicUser = { id: user.id, username: user.username, name: user.name, role: user.role, mustChangePassword: Boolean(user.mustChangePassword) };
  await logAudit({ action: "login", userId: user.id, entity: "session", entityId: user.id });
  return res.json({ user: publicUser, token: signUserToken({ ...publicUser, passwordChangedAt: user.passwordChangedAt }) });
};