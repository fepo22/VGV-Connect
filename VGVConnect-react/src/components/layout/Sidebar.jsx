import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Sidebar() {
  const { user } = useAuth();
  const linksByRole = {
    admin: [["/dashboard", "⌂", "Dashboard"], ["/entregas", "▣", "Entregas"], ["/rutas", "↗", "Rutas"], ["/choferes", "◉", "Choferes"], ["/reportes", "▤", "Reportes"]],
    route_planner: [["/dashboard", "⌂", "Dashboard"], ["/rutas", "↗", "Rutas"], ["/choferes", "◉", "Choferes"], ["/entregas", "▣", "Entregas"]],
    billing: [["/dashboard", "⌂", "Dashboard"], ["/reportes", "▤", "Reportes"], ["/entregas", "▣", "Entregas"]],
    driver: [["/chofer", "◉", "Mis entregas"]],
  };
  const links = linksByRole[user?.role] || [];

  return (
    <aside className="sidebar">
      <div className="brand-lockup"><span className="brand-mark">V</span><span><strong>VGV</strong><small>Connect</small></span></div>
      <p className="sidebar-label">{user?.role === "driver" ? "Terreno" : "Operación"}</p>
      <nav className="sidebar-nav" aria-label="Navegación principal">
        {links.map(([to, icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}><span className="nav-icon" aria-hidden="true">{icon}</span>{label}</NavLink>)}
      </nav>
      <div className="sidebar-status"><span /> Sistema operativo</div>
    </aside>
  );
}
