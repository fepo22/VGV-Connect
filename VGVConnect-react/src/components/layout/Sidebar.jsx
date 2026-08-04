import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        background: "#1f2937",
        color: "#f8fafc",
        minHeight: "100vh",
        padding: "24px 18px",
        boxShadow: "2px 0 20px rgba(15, 23, 42, 0.08)",
      }}
    >
      <h2 style={{ marginBottom: "32px", fontSize: "1.4rem", letterSpacing: "0.5px", color: "#f8fafc" }}>
        VGV Connect
      </h2>
      <nav>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: "18px" }}>
            <Link to="/dashboard" style={{ color: "#e2e8f0", textDecoration: "none", display: "inline-flex", gap: "10px", alignItems: "center" }}>
              <span>🏠</span>
              Dashboard
            </Link>
          </li>
          <li style={{ marginBottom: "18px" }}>
            <Link to="/entregas" style={{ color: "#e2e8f0", textDecoration: "none", display: "inline-flex", gap: "10px", alignItems: "center" }}>
              <span>📦</span>
              Entregas
            </Link>
          </li>
          <li style={{ marginBottom: "18px" }}>
            <Link to="/choferes" style={{ color: "#e2e8f0", textDecoration: "none", display: "inline-flex", gap: "10px", alignItems: "center" }}>
              <span>🚚</span>
              Choferes
            </Link>
          </li>
          <li style={{ marginBottom: "18px" }}>
            <Link to="/rutas" style={{ color: "#e2e8f0", textDecoration: "none", display: "inline-flex", gap: "10px", alignItems: "center" }}>
              <span>🛣️</span>
              Rutas
            </Link>
          </li>
          <li style={{ marginBottom: "18px" }}>
            <Link to="/rutas/choferes" style={{ color: "#e2e8f0", textDecoration: "none", display: "inline-flex", gap: "10px", alignItems: "center" }}>
              <span>📋</span>
              Hoja de Ruta
            </Link>
          </li>
          <li style={{ marginBottom: "18px" }}>
            <Link to="/reportes" style={{ color: "#e2e8f0", textDecoration: "none", display: "inline-flex", gap: "10px", alignItems: "center" }}>
              <span>📊</span>
              Reportes
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
