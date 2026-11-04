import prisma from "../prismaClient.js";
import { passwordVersion, requireAuth } from "./auth.middleware.js";

export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";

// Revalida el JWT contra la base: un token emitido antes del último cambio de contraseña,
// de un usuario eliminado o con otro rol deja de ser válido.
export const loadSession = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user?.sub) },
    select: { id: true, role: true, mustChangePassword: true, passwordChangedAt: true },
  });
  if (!user || user.role !== req.user.role || passwordVersion(user.passwordChangedAt) !== (req.user.pwv ?? 0)) {
    return res.status(401).json({ message: "Sesión revocada. Inicia sesión nuevamente." });
  }
  req.session = { mustChangePassword: user.mustChangePassword };
  return next();
};

// 403 y no 401: la sesión sigue siendo válida, solo falta cambiar la contraseña.
export const requirePasswordCurrent = (req, res, next) => {
  if (req.session?.mustChangePassword) {
    return res.status(403).json({ message: "Debes cambiar tu contraseña antes de continuar.", code: PASSWORD_CHANGE_REQUIRED });
  }
  return next();
};

export const requireValidSession = [requireAuth, loadSession];
export const requireSession = [requireAuth, loadSession, requirePasswordCurrent];
