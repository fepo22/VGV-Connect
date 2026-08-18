import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDriverDeliveries } from "../../api/drivers.api";
import { getRoutes } from "../../api/routes.api";
import useAuth from "../../hooks/useAuth";

const statusOf = (delivery) => delivery.estado || delivery.status;

export default function DashboardChofer() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDriverDeliveries(user.id), getRoutes(user.id)])
      .then(([deliveryResponse, routeResponse]) => {
        setDeliveries(deliveryResponse.data);
        setRoutes(routeResponse.data.routes);
      })
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, [user.id]);

  const metrics = useMemo(() => ({
    total: deliveries.length,
    completed: deliveries.filter((item) => ["completed", "delivered"].includes(statusOf(item))).length,
    pending: deliveries.filter((item) => !["completed", "delivered"].includes(statusOf(item))).length,
  }), [deliveries]);

  return (
    <section className="driver-page">
      <div className="driver-hero"><div><p className="eyebrow">Panel de chofer</p><h2>Hola, {user.name}</h2><p>Revisa tus entregas asignadas y registra cada resultado desde terreno.</p></div><span className="driver-role">driver</span></div>
      <div className="driver-metrics"><article><small>Asignadas</small><strong>{loading ? "-" : metrics.total}</strong></article><article><small>Completadas</small><strong>{loading ? "-" : metrics.completed}</strong></article><article><small>Pendientes</small><strong>{loading ? "-" : metrics.pending}</strong></article></div>
      <div className="driver-deliveries"><div className="panel-heading"><div><p className="eyebrow">Rutas asignadas</p><h3>{routes.length ? routes.map((route) => route.name).join(" · ") : "Sin ruta asignada"}</h3></div></div>{loading ? <p>Cargando entregas...</p> : deliveries.map((delivery) => <div className="driver-delivery" key={delivery.id}><div><strong>{delivery.cliente}</strong><small>{delivery.direccion} · Ruta #{delivery.routeId || "-"}</small></div><span>{statusOf(delivery)}</span>{statusOf(delivery) !== "delivered" && <Link className="secondary-action" to={`/chofer/entregas/${delivery.id}`}>Registrar</Link>}</div>)}</div>
    </section>
  );
}
