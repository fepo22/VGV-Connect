import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDriverDeliveries, getDriverHistory } from "../../api/drivers.api";
import { getRoutes } from "../../api/routes.api";
import useAuth from "../../hooks/useAuth";
import { normalizeDeliveryStatus } from "../../utils/deliveryStatus";

const completedStatuses = ["completed"];
const statusOf = (delivery) => normalizeDeliveryStatus(delivery.estado || delivery.status);
const routeLabel = (route) => route.documentNumber || `Ruta #${route.id}`;

export default function DashboardChofer() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getDriverDeliveries(user.id), getRoutes(user.id), getDriverHistory()])
      .then(([deliveryResponse, routeResponse, historyResponse]) => {
        setDeliveries(deliveryResponse.data);
        setRoutes(routeResponse.data.routes);
        setHistory(historyResponse.data);
      })
      .catch(() => setError("No se pudo cargar tu operación."))
      .finally(() => setLoading(false));
  }, [user.id]);

  const metrics = useMemo(() => {
    const completed = deliveries.filter((item) => completedStatuses.includes(statusOf(item))).length;
    const incidents = deliveries.filter((item) => ["rejected", "not_found"].includes(statusOf(item))).length;
    return {
      total: deliveries.length,
      completed,
      pending: deliveries.length - completed,
      incidents,
      rate: deliveries.length ? Math.round((completed / deliveries.length) * 100) : 0,
    };
  }, [deliveries]);

  const activeRoute = routes.find((route) => ["in_progress", "planned"].includes(route.status)) || routes[0];
  const nextStop = activeRoute?.stops?.filter((stop) => !completedStatuses.includes(stop.status)).sort((first, second) => first.sequence - second.sequence)[0];
  const pendingDeliveries = deliveries.filter((delivery) => !completedStatuses.includes(statusOf(delivery)));

  return (
    <section className="driver-page">
      <div className="driver-hero">
        <div><p className="eyebrow">Panel de chofer</p><h2>Hola, {user.name}</h2><p>Ejecuta tu ruta, registra cada entrega y mantén la trazabilidad al día.</p></div>
        <span className="driver-role">driver</span>
      </div>

      {error && <p className="route-error" role="alert">{error}</p>}

      <div className="driver-metrics">
        <article><small>Entregas asignadas</small><strong>{loading ? "-" : metrics.total}</strong></article>
        <article><small>Completadas</small><strong>{loading ? "-" : metrics.completed}</strong></article>
        <article><small>Pendientes</small><strong>{loading ? "-" : metrics.pending}</strong></article>
        <article><small>Incidencias</small><strong>{loading ? "-" : metrics.incidents}</strong></article>
        <article><small>Cumplimiento</small><strong>{loading ? "-" : `${metrics.rate}%`}</strong></article>
      </div>

      <div className="driver-dashboard-grid">
        <section className="driver-active-route">
          <div className="panel-heading"><div><p className="eyebrow">Ruta activa</p><h3>{activeRoute ? routeLabel(activeRoute) : "Sin ruta asignada"}</h3></div><span>{activeRoute?.status || "-"}</span></div>
          {activeRoute ? <><p className="driver-route-meta">{activeRoute.vehicleName} · {activeRoute.vehicleLicensePlate || "Patente pendiente"} · inicio {activeRoute.startTime}</p><p className="driver-route-destination">Destino: <strong>{activeRoute.destination}</strong></p><div className="driver-next-stop"><div><small>Próxima parada</small><strong>{nextStop?.client || "Ruta completada"}</strong><span>{nextStop?.address || "No hay entregas pendientes"}</span></div>{nextStop && <Link className="primary-action" to={`/chofer/entregas/${nextStop.id}`}>Registrar entrega</Link>}</div></> : <p>No tienes una ruta asignada.</p>}
        </section>

        <section className="driver-deliveries">
          <div className="panel-heading"><div><p className="eyebrow">Trabajo pendiente</p><h3>Entregas por ejecutar</h3></div><span>{pendingDeliveries.length}</span></div>
          {loading ? <p>Cargando entregas...</p> : pendingDeliveries.length === 0 ? <p>No tienes entregas pendientes.</p> : pendingDeliveries.map((delivery) => <div className="driver-delivery" key={delivery.id}><div><strong>{delivery.cliente}</strong><small>{delivery.direccion} · Guía {delivery.guideNumber || "pendiente"}</small></div><span>{statusOf(delivery)}</span><Link className="secondary-action" to={`/chofer/entregas/${delivery.id}`}>Registrar</Link></div>)}
        </section>
      </div>

      <section className="driver-history">
        <div className="panel-heading"><div><p className="eyebrow">Trazabilidad</p><h3>Historial de actividad</h3></div><span>{history.length}</span></div>
        {loading ? <p>Cargando historial...</p> : history.length === 0 ? <p>Aún no tienes actividades registradas.</p> : history.slice(0, 8).map((event) => <div className="driver-history-row" key={event.id}><span className="history-dot" /><div><strong>{event.action === "delivery_photo_uploaded" ? "Foto registrada" : "Entrega actualizada"}</strong><small>Entrega #{event.entityId} · {new Date(event.createdAt).toLocaleString("es-CL")}</small></div><em>{event.metadata?.status || "registrado"}</em></div>)}
      </section>
    </section>
  );
}
