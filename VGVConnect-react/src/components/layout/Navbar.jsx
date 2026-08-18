import { useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const titles = { "/dashboard": ["Dashboard operativo", "Controla el estado de la operación en tiempo real"], "/entregas": ["Entregas", "Supervisa el estado de cada pedido"], "/rutas": ["Planificador de rutas", "Organiza recorridos y paradas"], "/choferes": ["Choferes", "Gestiona la operación en terreno"], "/reportes": ["Reportes", "Analiza el rendimiento y detecta desvíos"] };
  const [title, subtitle] = titles[location.pathname] || titles["/dashboard"];

  return <header className="topbar"><div><p className="eyebrow">VGV CONNECT / OPERACIONES</p><h1>{title}</h1><p className="topbar-subtitle">{subtitle}</p></div><div className="profile"><span className="profile-avatar">OP</span><span><strong>Operaciones</strong><small>Sesión activa</small></span></div></header>;
}
