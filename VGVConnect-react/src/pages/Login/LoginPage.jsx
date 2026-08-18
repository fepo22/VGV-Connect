import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError("Completa usuario y contraseña.");
      return;
    }

    try {
      const user = await loginUser(identifier, password);
      login(user);
      const roleHome = {
        driver: "/chofer",
        route_planner: "/rutas",
        billing: "/reportes",
        admin: "/dashboard",
      };
      navigate(roleHome[user.role] || "/dashboard");
    } catch {
      setError("Credenciales inválidas.");
    }
  };

  return (
    <div className="login-screen">
      <form onSubmit={handleLogin} className="login-card">
        <span className="brand-mark">V</span>
        <h1>VGV Connect</h1>
        <p>Gestiona entregas y rutas desde un solo lugar.</p>

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <label>Usuario</label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <label>Contraseña / PIN</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
