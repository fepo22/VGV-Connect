import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDeliveries } from "../../api/deliveries.api";

const readStatus = (delivery) => delivery.status || delivery.estado;

export default function Dashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeliveries()
      .then(({ data }) => setDeliveries(data))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => ({
    total: deliveries.length,
    delivered: deliveries.filter((item) => readStatus(item) === "delivered").length,
    inRoute: deliveries.filter((item) => readStatus(item) === "in_route").length,
    pending: deliveries.filter((item) => readStatus(item) === "pending").length,
  }), [deliveries]);

  return (
    <section className="dashboard-page">
      <div className="dashboard-intro">
        <div>
          <p className="eyebrow">Centro de control</p>
          <h2>La operación, de un vistazo.</h2>
          <p>Consulta el estado del día y entra directamente al módulo que necesita atención.</p>
        </div>
        <Link className="primary-action" to="/entregas">Revisar entregas</Link>
      </div>

      <div className="dashboard-kpis">
        <article className="kpi-card"><span>Total del día</span><strong>{loading ? "-" : summary.total}</strong><small>Entregas registradas</small></article>
        <article className="kpi-card kpi-success"><span>Completadas</span><strong>{loading ? "-" : summary.delivered}</strong><small>Listas para cerrar</small></article>
        <article className="kpi-card kpi-route"><span>En ruta</span><strong>{loading ? "-" : summary.inRoute}</strong><small>En movimiento</small></article>
        <article className="kpi-card kpi-pending"><span>Pendientes</span><strong>{loading ? "-" : summary.pending}</strong><small>Requieren seguimiento</small></article>
      </div>

      <div className="dashboard-workflow">
        <div className="workflow-heading"><div><p className="eyebrow">Flujo de trabajo</p><h3>Del pedido al resultado</h3></div><Link to="/reportes">Ver reportes →</Link></div>
        <div className="workflow-grid">
          <Link to="/entregas" className="workflow-step"><b>01</b><span>Entregas</span><small>Actualiza estados, fotos y evidencias.</small></Link>
          <Link to="/rutas" className="workflow-step"><b>02</b><span>Rutas</span><small>Ordena recorridos y revisa paradas.</small></Link>
          <Link to="/choferes" className="workflow-step"><b>03</b><span>Choferes</span><small>Consulta la operación en terreno.</small></Link>
          <Link to="/reportes" className="workflow-step"><b>04</b><span>Reportes</span><small>Mide resultados y detecta atrasos.</small></Link>
        </div>
      </div>
    </section>
  );
}
