import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState(""); // email o celular
  const [password, setPassword] = useState("");     // password o PIN
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validación mínima
    if (!identifier.trim() || !password.trim()) {
      setError("Completa todos los campos");
      return;
    }

    if (!identifier.includes("@") && !/^[0-9]{8,12}$/.test(identifier)) {
      setError("Usa un correo de operación o un celular de chofer.");
      return;
    }

    try {
      const user = await loginUser(identifier, password);
      login(user);
      navigate(user.role === "driver" ? "/chofer" : "/dashboard");
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

        <label>Correo o celular</label>
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
