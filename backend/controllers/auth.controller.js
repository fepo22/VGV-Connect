import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { signUserToken } from "../middleware/auth.middleware.js";

export const login = async (req, res) => {
  const key = String(req.body.identifier || "").trim();
  const user = await prisma.user.findFirst({ where: { username: { equals: key, mode: "insensitive" } } });
  if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) {
    return res.status(400).json({ message: "Credenciales inválidas" });
  }
  const publicUser = { id: user.id, username: user.username, name: user.name, role: user.role };
  await logAudit({ action: "login", userId: user.id, entity: "session", entityId: user.id });
  return res.json({ user: publicUser, token: signUserToken(publicUser) });
};