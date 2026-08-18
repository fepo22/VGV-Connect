import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDeliveries } from "../../api/deliveries.api";
import { normalizeDeliveryStatus } from "../../utils/deliveryStatus";

const readStatus = (delivery) => normalizeDeliveryStatus(delivery.status || delivery.estado);

export default function Reportes() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeliveries()
      .then(({ data }) => setDeliveries(data))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const operationalDeliveries = deliveries.filter((item) => item.routeId != null);
    const total = operationalDeliveries.length;
    const completedItems = operationalDeliveries.filter((item) => readStatus(item) === "completed");
    const completed = completedItems.length;
    const inProgress = operationalDeliveries.filter((item) => readStatus(item) === "in_progress").length;
    const pending = operationalDeliveries.filter((item) => ["pending", "planned"].includes(readStatus(item))).length;
    const rejected = operationalDeliveries.filter((item) => readStatus(item) === "rejected").length;
    const notFound = operationalDeliveries.filter((item) => readStatus(item) === "not_found").length;
    const incidents = rejected + notFound;
    const evidenceCount = completedItems.filter((item) => item.photoUrl).length;
    const evidenceRate = completed ? Math.round((evidenceCount / completed) * 100) : 0;
    const drivers = Object.values(operationalDeliveries.reduce((groups, item) => {
      const name = item.driverName || "Sin chofer asignado";
      const current = groups[name] || { name, total: 0, completed: 0, active: 0, incidents: 0 };
      current.total += 1;
      current.completed += readStatus(item) === "completed" ? 1 : 0;
      current.active += readStatus(item) === "in_progress" ? 1 : 0;
      current.incidents += ["rejected", "not_found"].includes(readStatus(item)) ? 1 : 0;
      groups[name] = current;
      return groups;
    }, {})).sort((first, second) => second.total - first.total);
    const attentionItems = operationalDeliveries.filter((item) => ["pending", "rejected", "not_found"].includes(readStatus(item))).slice(0, 5);
    return {
      total,
      completed,
      pending,
      inProgress,
      incidents,
      rejected,
      notFound,
      evidenceCount,
      evidenceRate,
      drivers,
      attentionItems,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [deliveries]);

  return (
    <section className="reports-page">
      <div className="reports-intro">
        <div><p className="eyebrow">Seguimiento operativo</p><h2>Reporte de ejecución</h2><p>Prioriza excepciones, verifica evidencia y distribuye la carga de la operación.</p></div>
        <Link className="secondary-action" to="/dashboard">Volver al dashboard</Link>
      </div>
      <div className="report-metrics">
        <article><span>Cumplimiento</span><strong>{loading ? "-" : `${metrics.completionRate}%`}</strong><small>{loading ? "" : `${metrics.completed} de ${metrics.total} entregas confirmadas`}</small></article>
        <article><span>En ejecución</span><strong>{loading ? "-" : metrics.inProgress}</strong><small>Entregas que siguen en terreno</small></article>
        <article><span>Con evidencia</span><strong>{loading ? "-" : `${metrics.evidenceRate}%`}</strong><small>{loading ? "" : `${metrics.evidenceCount} confirmaciones con foto`}</small></article>
        <article><span>Incidencias</span><strong>{loading ? "-" : metrics.incidents}</strong><small>Rechazadas o no encontradas</small></article>
      </div>
      {!loading && <div className="report-analysis-grid">
        <section className="report-panel">
          <div className="report-panel-heading"><div><p className="eyebrow">Atención prioritaria</p><h3>{metrics.pending + metrics.incidents} casos requieren revisión</h3></div><Link to="/entregas">Ver entregas</Link></div>
          <div className="report-alert-summary"><span>Pendientes: <b>{metrics.pending}</b></span><span>Rechazadas: <b>{metrics.rejected}</b></span><span>No encontradas: <b>{metrics.notFound}</b></span></div>
          {metrics.attentionItems.length ? <div className="report-attention-list">{metrics.attentionItems.map((item) => <article key={item.id}><div><strong>{item.guideNumber || "Sin guía"}</strong><small>{item.cliente || item.client || "Cliente sin nombre"} · {item.direccion || item.address || "Sin dirección"}</small></div><span>{readStatus(item) === "not_found" ? "No encontrada" : readStatus(item) === "rejected" ? "Rechazada" : "Pendiente"}</span></article>)}</div> : <p className="report-empty">No hay casos críticos pendientes de revisión.</p>}
        </section>
        <section className="report-panel">
          <div className="report-panel-heading"><div><p className="eyebrow">Carga por chofer</p><h3>Distribución de la operación</h3></div></div>
          {metrics.drivers.length ? <div className="report-driver-list">{metrics.drivers.map((driver) => <article key={driver.name}><div><strong>{driver.name}</strong><small>{driver.completed} completadas · {driver.active} en progreso · {driver.incidents} incidencias</small></div><b>{driver.total}</b></article>)}</div> : <p className="report-empty">No hay choferes asignados en este período.</p>}
        </section>
      </div>}
      <div className="report-next-step"><div><p className="eyebrow">Decisión recomendada</p><h3>{loading ? "Revisando la operación..." : metrics.incidents ? "Atiende primero las incidencias reportadas" : metrics.pending ? "Asigna seguimiento a las entregas pendientes" : "La operación no registra excepciones"}</h3><p>{loading ? "" : "Abre el listado para revisar evidencia, ubicación y responsable de cada caso."}</p></div><Link className="primary-action" to="/entregas">Abrir entregas</Link></div>
    </section>
  );
}
