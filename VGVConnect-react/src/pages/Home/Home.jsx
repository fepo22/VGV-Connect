import { Link } from "react-router-dom";

const shortcuts = [
  { to: "/entregas", icon: "▣", label: "Entregas", text: "Consulta y actualiza pedidos" },
  { to: "/rutas", icon: "↗", label: "Rutas", text: "Organiza recorridos y paradas" },
  { to: "/choferes", icon: "◉", label: "Conductores", text: "Revisa la operación en terreno" },
  { to: "/reportes", icon: "▤", label: "Reportes", text: "Analiza el rendimiento" },
];

export default function Home() {
  return (
    <section className="home-page">
      <div className="home-hero">
        <p className="eyebrow">VGV CONNECT TMS / OPERACIONES</p>
        <h2>Todo el movimiento, en un solo lugar.</h2>
        <p className="home-intro">
          Accede rápidamente a la información que mantiene tus entregas en marcha.
        </p>
      </div>

      <div className="home-section-heading">
        <div>
          <p className="eyebrow">Accesos rápidos</p>
          <h3>¿Qué necesitas revisar?</h3>
        </div>
        <span className="home-status"><span /> Sistema operativo</span>
      </div>

      <div className="home-shortcuts">
        {shortcuts.map((shortcut) => (
          <Link className="home-shortcut" key={shortcut.to} to={shortcut.to}>
            <span className="nav-icon" aria-hidden="true">{shortcut.icon}</span>
            <span>
              <strong>{shortcut.label}</strong>
              <small>{shortcut.text}</small>
            </span>
            <span className="shortcut-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
