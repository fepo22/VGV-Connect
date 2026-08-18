import { useEffect, useState } from "react";
import { getDriversOverview } from "../../api/admin-drivers.api";
import useAuth from "../../hooks/useAuth";

export default function DriversOverview() {
  const { user } = useAuth();
  const [data, setData] = useState({ drivers: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = user.role === "admin";

  useEffect(() => {
    getDriversOverview()
      .then(({ data: overview }) => setData(overview))
      .catch(() => setError("No se pudo cargar el resumen de choferes."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="drivers-overview-page">
      <div className="drivers-overview-heading"><div><p className="eyebrow">{isAdmin ? "Supervisión general" : "Planificación operativa"}</p><h2>{isAdmin ? "Panel de choferes" : "Choferes y asignaciones"}</h2><p>{isAdmin ? "Resumen global de rendimiento, rutas, cargas e incidencias." : "Consulta la disponibilidad y el avance para asignar rutas con criterio."}</p></div><span className="driver-role">{isAdmin ? "admin" : "route planner"}</span></div>
      {error && <p className="route-error" role="alert">{error}</p>}
      <div className="driver-overview-kpis"><article><small>Choferes</small><strong>{loading ? "-" : data.summary.drivers || 0}</strong></article><article><small>Rutas activas</small><strong>{loading ? "-" : data.summary.activeRoutes || 0}</strong></article><article><small>Entregas</small><strong>{loading ? "-" : data.summary.deliveries || 0}</strong></article><article><small>{isAdmin ? "Incidencias" : "Completadas"}</small><strong>{loading ? "-" : isAdmin ? data.summary.incidents || 0 : data.summary.completed || 0}</strong></article></div>
      <div className="drivers-overview-list"><div className="panel-heading"><div><p className="eyebrow">Operación en terreno</p><h3>{isAdmin ? "Todos los choferes" : "Estado para asignación"}</h3></div></div>{loading ? <p>Cargando choferes...</p> : data.drivers.map((driver) => <article className="driver-overview-card" key={driver.id}><div className="driver-overview-card-heading"><div><strong>{driver.name}</strong><small>@{driver.username}</small></div><span className={driver.activeRoutes ? "is-active" : "is-idle"}>{driver.activeRoutes ? "Con ruta" : "Disponible"}</span></div><div className="driver-overview-stats"><span><b>{driver.routeCount}</b> rutas</span><span><b>{driver.completed}</b> completadas</span><span><b>{driver.pending}</b> pendientes</span><span><b>{driver.incidents}</b> incidencias</span><span><b>{driver.weightKg}</b> kg</span><span><b>{driver.volumeM3}</b> m3</span></div>{driver.routes.length > 0 && <div className="driver-route-lines">{driver.routes.slice(0, 3).map((route) => <small key={route.id}>{route.documentNumber || `Ruta #${route.id}`} · {route.vehicle?.licensePlate || "Sin patente"} · {route.status}</small>)}</div>}</article>)}</div>
    </section>
  );
}
