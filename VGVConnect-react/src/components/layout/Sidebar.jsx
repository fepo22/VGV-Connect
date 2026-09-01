import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Sidebar() {
  const { user } = useAuth();
  const linksByRole = {
    admin: [["/dashboard", "⌂", "Dashboard"], ["/entregas", "▣", "Entregas"], { to: "/rutas", label: "Rutas", icon: "↗", children: [["/rutas/entregas", "Entregas"], ["/rutas/retiros", "Retiros"]] }, ["/choferes", "◉", "Conductores"], ["/reportes", "▤", "Reportes"]],
    route_planner: [["/dashboard", "⌂", "Dashboard"], { to: "/rutas", label: "Rutas", icon: "↗", children: [["/rutas/entregas", "Entregas"], ["/rutas/retiros", "Retiros"]] }, ["/choferes", "◉", "Conductores"], ["/entregas", "▣", "Entregas"]],
    billing: [["/dashboard", "⌂", "Dashboard"], ["/reportes", "▤", "Reportes"], ["/entregas", "▣", "Entregas"]],
    driver: [["/conductor", "◉", "Mis entregas"], ["/conductor/check-vehiculo", "✓", "Check vehículo"]],
  };
  const links = linksByRole[user?.role] || [];

  return (
    <aside className="sidebar">
      <div className="brand-lockup"><img className="brand-logo" src="/logo-vgv.jpg" alt="Vgv Connect TMS" /><span><strong>Vgv Connect</strong><small>TMS</small></span></div>
      <p className="sidebar-label">{user?.role === "driver" ? "Terreno" : "Operación"}</p>
      <nav className="sidebar-nav" aria-label="Navegación principal">
        {links.map((item) => Array.isArray(item) ? (
          <NavLink key={item[0]} to={item[0]} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}><span className="nav-icon" aria-hidden="true">{item[1]}</span>{item[2]}</NavLink>
        ) : (
          <div className="nav-group" key={item.label}>
            <NavLink end to={item.to} className={({ isActive }) => `nav-item nav-group-label${isActive ? " active" : ""}`}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>
            <div className="nav-submenu">
              {item.children.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-subitem${isActive ? " active" : ""}`}>{label}</NavLink>)}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-status"><span /> Sistema operativo</div>
    </aside>
  );
}
