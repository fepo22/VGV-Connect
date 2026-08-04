import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div>
      <h1>Menú Principal</h1>
      <ul>
        <li><Link to="/entregas">📦 Entregas</Link></li>
        <li><Link to="/choferes">🚚 Choferes</Link></li>
        <li><Link to="/rutas">🗺️ Rutas</Link></li>
        <li><Link to="/reportes">📊 Reportes</Link></li>
      </ul>
    </div>
  );
}
