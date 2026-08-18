import { useDeferredValue, useMemo, useState } from "react";
import { useDeliveries } from "../../hooks/useDeliveries";
import DeliveryList from "../../components/deliveries/DeliveryList";
import { normalizeDeliveryStatus } from "../../utils/deliveryStatus";

export default function DeliveriesPage() {
  const { deliveries, loading, error } = useDeliveries();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const operationalDeliveries = useMemo(() => deliveries.filter((delivery) => delivery.routeId != null), [deliveries]);
  const filteredDeliveries = useMemo(() => operationalDeliveries.filter((delivery) => {
    const status = normalizeDeliveryStatus(delivery.estado || delivery.status);
    const searchable = [delivery.guideNumber, delivery.client, delivery.address, delivery.driverName, delivery.route?.documentNumber].filter(Boolean).join(" ").toLowerCase();
    return (statusFilter === "all" || status === statusFilter) && (!deferredSearch || searchable.includes(deferredSearch));
  }), [operationalDeliveries, deferredSearch, statusFilter]);
  const metrics = useMemo(() => ({
    total: operationalDeliveries.length,
    active: operationalDeliveries.filter((delivery) => normalizeDeliveryStatus(delivery.estado || delivery.status) === "in_progress").length,
    completed: operationalDeliveries.filter((delivery) => normalizeDeliveryStatus(delivery.estado || delivery.status) === "completed").length,
    issues: operationalDeliveries.filter((delivery) => ["rejected", "not_found"].includes(normalizeDeliveryStatus(delivery.estado || delivery.status))).length,
  }), [operationalDeliveries]);

  return (
    <section className="deliveries-page">
      <div className="deliveries-heading"><div><p className="eyebrow">Seguimiento operativo</p><h2>Control de entregas</h2><p>Consulta la ejecución, evidencia e incidencias de cada documento asignado.</p></div><span className="deliveries-count">{loading ? "-" : metrics.total} entregas</span></div>
      <div className="delivery-metrics">
        <article><span>Total</span><strong>{loading ? "-" : metrics.total}</strong></article>
        <article><span>En progreso</span><strong>{loading ? "-" : metrics.active}</strong></article>
        <article><span>Completadas</span><strong>{loading ? "-" : metrics.completed}</strong></article>
        <article><span>Con incidencia</span><strong>{loading ? "-" : metrics.issues}</strong></article>
      </div>
      <div className="delivery-toolbar">
        <label className="delivery-search">Buscar entrega<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Guía, cliente, dirección o chofer" /></label>
        <label className="delivery-filter">Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option value="pending">Pendiente</option><option value="in_progress">En progreso</option><option value="completed">Completado</option><option value="rejected">Rechazado</option><option value="not_found">No encontrado</option></select></label>
      </div>
      {error && <p className="route-error" role="alert">{error}</p>}
      {loading ? <p>Cargando entregas...</p> : <DeliveryList deliveries={filteredDeliveries} />}
    </section>
  );
}
