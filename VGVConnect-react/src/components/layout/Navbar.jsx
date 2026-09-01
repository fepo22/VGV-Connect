import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const titles = { "/dashboard": ["Dashboard operativo", "Controla el estado de la operación en tiempo real"], "/entregas": ["Entregas", "Supervisa el estado de cada pedido"], "/rutas": ["Planificador de rutas", "Organiza recorridos y paradas"], "/rutas/entregas": ["Rutas de entrega", "Programa despachos a clientes"], "/rutas/retiros": ["Rutas de retiro", "Programa retiros de mercadería y compras"], "/choferes": ["Panel de conductores", "Supervisa disponibilidad, rutas y rendimiento"], "/reportes": ["Reportes", "Analiza el rendimiento y detecta desvíos"] };
  const [title, subtitle] = titles[location.pathname] || titles["/dashboard"];

  const handleLogout = () => {
    const confirmed = window.confirm("¿Cerrar sesión y volver al inicio?");
    if (!confirmed) return;
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">VGV CONNECT / OPERACIONES</p>
        <h1>{title}</h1>
        <p className="topbar-subtitle">{subtitle}</p>
      </div>

      <div className="profile-wrap">
        <div className="profile">
          <span className="profile-avatar">{user?.name?.slice(0, 2).toUpperCase() || "VG"}</span>
          <span>
            <strong>{user?.name || "Usuario"}</strong>
            <small>{user?.role || "Sesión activa"}</small>
          </span>
        </div>
        {user && (
          <button type="button" className="logout-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  );
}
