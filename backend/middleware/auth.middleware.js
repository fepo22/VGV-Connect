import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET es obligatorio y debe tener al menos 32 bytes UTF-8.");
}

// Versión de credencial incluida en el token: cambia cada vez que se cambia o renueva la contraseña.
export const passwordVersion = (passwordChangedAt) => (passwordChangedAt ? new Date(passwordChangedAt).getTime() : 0);

export const signUserToken = (user) =>
  jwt.sign({ sub: user.id, name: user.name, role: user.role, pwv: passwordVersion(user.passwordChangedAt) }, JWT_SECRET, { algorithm: "HS256", expiresIn: "8h" });

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Token requerido" });

  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
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
