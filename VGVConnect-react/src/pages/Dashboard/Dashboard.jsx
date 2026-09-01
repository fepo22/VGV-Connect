import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDeliveries } from "../../api/deliveries.api";
import { normalizeDeliveryStatus } from "../../utils/deliveryStatus";

const readStatus = (delivery) => normalizeDeliveryStatus(delivery.status || delivery.estado);

export default function Dashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeliveries()
      .then(({ data }) => setDeliveries(data))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const operationalDeliveries = deliveries.filter((item) => item.routeId != null);
    return {
      total: operationalDeliveries.length,
      completed: operationalDeliveries.filter((item) => readStatus(item) === "completed").length,
      inProgress: operationalDeliveries.filter((item) => readStatus(item) === "in_progress").length,
      pending: operationalDeliveries.filter((item) => readStatus(item) === "pending").length,
    };
  }, [deliveries]);

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
        <article className="kpi-card"><span>Total del día</span><strong>{loading ? "-" : summary.total}</strong><small>Entregas asignadas a ruta</small></article>
        <article className="kpi-card kpi-success"><span>Completadas</span><strong>{loading ? "-" : summary.completed}</strong><small>Listas para cerrar</small></article>
        <article className="kpi-card kpi-route"><span>En progreso</span><strong>{loading ? "-" : summary.inProgress}</strong><small>En movimiento</small></article>
        <article className="kpi-card kpi-pending"><span>Pendientes</span><strong>{loading ? "-" : summary.pending}</strong><small>Requieren seguimiento</small></article>
      </div>

      <div className="dashboard-workflow">
        <div className="workflow-heading"><div><p className="eyebrow">Flujo de trabajo</p><h3>Del pedido al resultado</h3></div><Link to="/reportes">Ver reportes →</Link></div>
        <div className="workflow-grid">
          <Link to="/entregas" className="workflow-step"><b>01</b><span>Entregas</span><small>Actualiza estados, fotos y evidencias.</small></Link>
          <Link to="/rutas" className="workflow-step"><b>02</b><span>Rutas</span><small>Ordena recorridos y revisa paradas.</small></Link>
          <Link to="/choferes" className="workflow-step"><b>03</b><span>Conductores</span><small>Consulta la operación en terreno.</small></Link>
          <Link to="/reportes" className="workflow-step"><b>04</b><span>Reportes</span><small>Mide resultados y detecta atrasos.</small></Link>
        </div>
      </div>
    </section>
  );
}
