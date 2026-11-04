import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { validateNewPassword } from "../services/password-policy.service.js";
import { signUserToken } from "../middleware/auth.middleware.js";
import { createLoginLimiter } from "../middleware/login-rate-limit.middleware.js";

// Instancia propia: verificar la contraseña actual no debe servir para adivinarla sin límite.
export const changePasswordLimiter = createLoginLimiter();

export const toPublicUser = (user) => ({ id: user.id, username: user.username, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword });

// Solo actúa sobre el usuario del token; cualquier identificador enviado en el cuerpo se ignora.
export const changePassword = async (req, res) => {
  const userId = Number(req.user.sub);
  const currentPassword = String(req.body?.currentPassword ?? "");
  const newPassword = String(req.body?.newPassword ?? "");
  const limiterKey = `user:${userId}`;
  const attempt = changePasswordLimiter.begin(req.ip, limiterKey);
  if (!attempt.allowed) {
    res.set("Retry-After", String(attempt.retryAfterSeconds));
    return res.status(429).json({ message: `Demasiados intentos. Intenta nuevamente en ${Math.ceil(attempt.retryAfterSeconds / 60)} minuto(s).` });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, name: true, role: true, passwordHash: true } });
  if (!user) return res.status(401).json({ message: "Sesión revocada. Inicia sesión nuevamente." });
  // 400 y no 401: una contraseña actual incorrecta no debe cerrar la sesión en el frontend.
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: "La contraseña actual no es correcta" });
  changePasswordLimiter.succeed(req.ip, limiterKey);
  if (newPassword === currentPassword) return res.status(400).json({ message: "La nueva contraseña debe ser distinta de la actual" });
  const passwordError = validateNewPassword(newPassword, { username: user.username, name: user.name });
  if (passwordError) return res.status(400).json({ message: passwordError });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false, passwordChangedAt: new Date() },
    select: { id: true, username: true, name: true, role: true, mustChangePassword: true, passwordChangedAt: true },
  });
  await logAudit({ action: "password_changed", userId, entity: "user", entityId: userId });
  // El token nuevo mantiene la sesión de este dispositivo; los anteriores quedan revocados.
  return res.json({ user: toPublicUser(updated), token: signUserToken(updated) });
};
