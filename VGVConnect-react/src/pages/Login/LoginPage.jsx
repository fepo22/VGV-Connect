import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";
import "./LoginPage.css";

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
        driver: "/conductor",
        route_planner: "/rutas",
        billing: "/reportes",
        admin: "/dashboard",
      };
      navigate(roleHome[user.role] || "/dashboard");
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      if (apiMessage) {
        setError(apiMessage);
        return;
      }
      if (error?.message?.includes("VITE_API_URL")) {
        setError("Configuracion faltante: define VITE_API_URL con la URL del backend.");
        return;
      }
      if (error?.request) {
        setError("No se pudo conectar con el servidor.");
        return;
      }
      setError("No fue posible iniciar sesion.");
    }
  };

  return (
    <div className="login-screen">
      <form onSubmit={handleLogin} className="login-card">
        <img className="login-logo" src="/logo-vgv.jpg" alt="Vgv Connect TMS" />
        <h1>Vgv Connect TMS</h1>
        <p>Gestiona entregas y rutas desde un solo lugar.</p>

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <label className="login-field">
          Usuario
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="login-field">
          Contraseña / PIN
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className="login-submit">
          Ingresar
        </button>
      </form>
    </div>
  );
}
