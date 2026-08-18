import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDeliveries } from "../../api/deliveries.api";

const readStatus = (delivery) => delivery.status || delivery.estado;

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
    const completed = deliveries.filter((item) => readStatus(item) === "delivered").length;
    const pending = deliveries.filter((item) => readStatus(item) === "pending").length;
    return {
      completed,
      pending,
      completionRate: deliveries.length ? Math.round((completed / deliveries.length) * 100) : 0,
    };
  }, [deliveries]);

  return (
    <section className="reports-page">
      <div className="reports-intro">
        <div><p className="eyebrow">Seguimiento operativo</p><h2>Reportes del día</h2><p>Convierte el estado de las entregas en decisiones para la operación.</p></div>
        <Link className="secondary-action" to="/dashboard">Volver al dashboard</Link>
      </div>
      <div className="report-metrics">
        <article><span>Tasa de cumplimiento</span><strong>{loading ? "-" : `${metrics.completionRate}%`}</strong><small>Entregas completadas sobre el total</small></article>
        <article><span>Completadas</span><strong>{loading ? "-" : metrics.completed}</strong><small>Resultados confirmados</small></article>
        <article><span>Pendientes</span><strong>{loading ? "-" : metrics.pending}</strong><small>Casos para seguimiento</small></article>
      </div>
      <div className="report-next-step"><div><p className="eyebrow">Siguiente acción</p><h3>¿Necesitas revisar un caso?</h3><p>Ve al listado de entregas para actualizar estados o registrar evidencia.</p></div><Link className="primary-action" to="/entregas">Abrir entregas</Link></div>
    </section>
  );
}
