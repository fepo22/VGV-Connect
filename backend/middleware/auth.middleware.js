import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vgv-connect-dev-secret";

export const signUserToken = (user) =>
  jwt.sign({ sub: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "8h" });

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Token requerido" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: "No tienes permisos para esta acción" });
  }
  return next();
};