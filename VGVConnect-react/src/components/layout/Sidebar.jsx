import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        background: "#2c3e50",
        color: "#ecf0f1",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <h2 style={{ marginBottom: "30px" }}>VGV Connect</h2>
      <nav>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "15px" }}>
            <Link to="/dashboard" style={{ color: "#ecf0f1", textDecoration: "none" }}>
              🏠 Dashboard
            </Link>
          </li>
          <li style={{ marginBottom: "15px" }}>
            <Link to="/entregas" style={{ color: "#ecf0f1", textDecoration: "none" }}>
              📦 Entregas
            </Link>
          </li>
          <li style={{ marginBottom: "15px" }}>
            <Link to="/choferes" style={{ color: "#ecf0f1", textDecoration: "none" }}>
              🚚 Choferes
            </Link>
          </li>
          <li style={{ marginBottom: "15px" }}>
            <Link to="/rutas" style={{ color: "#ecf0f1", textDecoration: "none" }}>
              🛣️ Rutas
            </Link>
          </li>
          <li style={{ marginBottom: "15px" }}>
            <Link to="/reportes" style={{ color: "#ecf0f1", textDecoration: "none" }}>
              📊 Reportes
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
