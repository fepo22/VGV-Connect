import { useDeferredValue, useMemo, useState } from "react";
import { useDeliveries } from "../../hooks/useDeliveries";
import DeliveryList from "../../components/deliveries/DeliveryList";
import { normalizeDeliveryStatus } from "../../utils/deliveryStatus";

export default function DeliveriesPage() {
  const { deliveries, loading, error } = useDeliveries();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateField, setDateField] = useState("createdAt");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [communeFilter, setCommuneFilter] = useState("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const operationalDeliveries = useMemo(() => deliveries.filter((delivery) => delivery.routeId != null), [deliveries]);
  const filterOptions = useMemo(() => ({
    drivers: [...new Set(operationalDeliveries.map((delivery) => delivery.driverName).filter(Boolean))].sort(),
    clients: [...new Set(operationalDeliveries.map((delivery) => delivery.client).filter(Boolean))].sort(),
    communes: [...new Set(operationalDeliveries.map((delivery) => delivery.commune).filter(Boolean))].sort(),
  }), [operationalDeliveries]);
  const filteredDeliveries = useMemo(() => operationalDeliveries.filter((delivery) => {
    const status = normalizeDeliveryStatus(delivery.estado || delivery.status);
    const searchable = [delivery.guideNumber, delivery.client, delivery.address, delivery.driverName, delivery.route?.documentNumber].filter(Boolean).join(" ").toLowerCase();
    const selectedDate = delivery[dateField] ? String(delivery[dateField]).slice(0, 10) : "";
    const matchesDate = (!fromDate || selectedDate >= fromDate) && (!toDate || selectedDate <= toDate);
    const matchesDriver = driverFilter === "all" || delivery.driverName === driverFilter;
    const matchesClient = clientFilter === "all" || delivery.client === clientFilter;
    const matchesCommune = communeFilter === "all" || delivery.commune === communeFilter;
    return (statusFilter === "all" || status === statusFilter) && matchesDate && matchesDriver && matchesClient && matchesCommune && (!deferredSearch || searchable.includes(deferredSearch));
  }), [operationalDeliveries, deferredSearch, statusFilter, dateField, fromDate, toDate, driverFilter, clientFilter, communeFilter]);
  const metrics = useMemo(() => ({
    total: operationalDeliveries.length,
    active: operationalDeliveries.filter((delivery) => normalizeDeliveryStatus(delivery.estado || delivery.status) === "in_progress").length,
    completed: operationalDeliveries.filter((delivery) => normalizeDeliveryStatus(delivery.estado || delivery.status) === "completed").length,
    issues: operationalDeliveries.filter((delivery) => ["rejected", "not_found"].includes(normalizeDeliveryStatus(delivery.estado || delivery.status))).length,
  }), [operationalDeliveries]);
  const alerts = useMemo(() => filteredDeliveries.filter((delivery) => ["pending", "rejected", "not_found"].includes(normalizeDeliveryStatus(delivery.status))).slice(0, 5), [filteredDeliveries]);
  const evidence = useMemo(() => filteredDeliveries.filter((delivery) => delivery.photoUrl), [filteredDeliveries]);

  const exportCsv = () => {
    const rows = [["Ruta", "Guía", "Cliente", "Dirección", "Comuna", "Chofer", "Estado", "Creada", "Actualizada", "Confirmada"]];
    filteredDeliveries.forEach((delivery) => rows.push([delivery.route?.documentNumber || "", delivery.guideNumber || "", delivery.client || "", delivery.address || "", delivery.commune || "", delivery.driverName || "", normalizeDeliveryStatus(delivery.status), delivery.createdAt || "", delivery.updatedAt || "", delivery.deliveredAt || ""]));
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "historial-entregas.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
        <label className="delivery-filter">Fecha<select value={dateField} onChange={(event) => setDateField(event.target.value)}><option value="createdAt">Creación</option><option value="updatedAt">Última modificación</option><option value="deliveredAt">Confirmación</option></select></label>
        <label className="delivery-filter">Desde<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="delivery-filter">Hasta<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <label className="delivery-filter">Chofer<select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}><option value="all">Todos</option>{filterOptions.drivers.map((driver) => <option key={driver} value={driver}>{driver}</option>)}</select></label>
        <label className="delivery-filter">Cliente<select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="all">Todos</option>{filterOptions.clients.map((client) => <option key={client} value={client}>{client}</option>)}</select></label>
        <label className="delivery-filter">Comuna<select value={communeFilter} onChange={(event) => setCommuneFilter(event.target.value)}><option value="all">Todas</option>{filterOptions.communes.map((commune) => <option key={commune} value={commune}>{commune}</option>)}</select></label>
        <div className="delivery-export-actions"><button className="secondary-action small" onClick={exportCsv} type="button">CSV para Excel</button><button className="secondary-action small" onClick={() => window.print()} type="button">Imprimir / PDF</button></div>
      </div>
      {!loading && alerts.length > 0 && <section className="delivery-alerts"><div><p className="eyebrow">Atención requerida</p><h3>{alerts.length} casos requieren seguimiento</h3></div><div>{alerts.map((delivery) => <span key={delivery.id}>{delivery.guideNumber || "Sin guía"} · {normalizeDeliveryStatus(delivery.status) === "not_found" ? "No encontrada" : normalizeDeliveryStatus(delivery.status) === "rejected" ? "Rechazada" : "Pendiente"}</span>)}</div></section>}
      {!loading && evidence.length > 0 && <section className="delivery-evidence-gallery"><div className="panel-heading"><div><p className="eyebrow">Evidencia</p><h3>Galería del período filtrado</h3></div><span>{evidence.length} fotos</span></div><div>{evidence.map((delivery) => <a key={delivery.id} href={delivery.photoUrl} target="_blank" rel="noreferrer"><img src={delivery.photoUrl} alt={`Evidencia ${delivery.guideNumber || delivery.id}`} /><span>{delivery.guideNumber || "Sin guía"}</span>{delivery.location && <small>Ubicación registrada</small>}</a>)}</div></section>}
      {error && <p className="route-error" role="alert">{error}</p>}
      {loading ? <p>Cargando entregas...</p> : <DeliveryList deliveries={filteredDeliveries} />}
    </section>
  );
}
