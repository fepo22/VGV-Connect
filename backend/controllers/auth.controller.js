import { logAudit } from "../data/audit.mock.js";
import { signUserToken } from "../middleware/auth.middleware.js";
import { users } from "../data/users.mock.js";

export const login = (req, res) => {
  const { identifier, password } = req.body;
  const user = users.find((item) => item.identifier === identifier && item.password === password);

  if (!user) {
    return res.status(400).json({ message: "Credenciales inválidas" });
  }

  logAudit({ action: "login", userId: user.id, role: user.role, entity: "session", entityId: user.id });
  const { password: _password, ...publicUser } = user;
  return res.json({ user: publicUser, token: signUserToken(publicUser) });
};