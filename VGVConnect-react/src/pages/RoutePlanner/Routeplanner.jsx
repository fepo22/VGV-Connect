import { useDeferredValue, useEffect, useMemo, useState } from "react";
import RouteList from "../../components/deliveries/RouteList";
import MapView from "../../components/maps/Mapview";
import { createRoute, deleteRoute, getRoutes, optimizeRoute, updateRoute } from "../../api/routes.api";
import { deliveryStatusOptions, getAllowedDeliveryStatuses } from "../../utils/deliveryStatus";

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  deliveryDate: "",
  startTime: "08:00",
  origin: "",
  destination: "",
  driverId: "",
  vehicleId: "",
  weightKg: "",
  volumeM3: "",
  stops: [],
};

const normalizeFormStops = (stops = []) =>
  (Array.isArray(stops) ? stops : []).map((stop) => ({
    id: stop.id ?? null,
    client: stop.client || stop.clientName || "Punto de descarga",
    address: stop.address || stop.direccion || "",
    guideNumber: stop.guideNumber || "",
    status: stop.status || "pending",
  }));

const routeStatusOptions = [
  { value: "draft", label: "Borrador" },
  { value: "planned", label: "Planificado" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completado" },
];

const routeTransitions = {
  draft: ["draft", "planned"],
  planned: ["planned", "in_progress"],
  in_progress: ["in_progress", "completed"],
  completed: ["completed"],
};

const formatRouteStatusLabel = (status) => ({
  draft: "Borrador",
  planned: "Planificado",
  in_progress: "En progreso",
  completed: "Completado",
  pending: "Pendiente",
})[status] || status;

export default function Routeplanner() {
  const [routes, setRoutes] = useState([]);
  const [availableStops, setAvailableStops] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [routeFromDate, setRouteFromDate] = useState("");
  const [routeToDate, setRouteToDate] = useState("");
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState({ routes: true, unassigned: true, form: true, stops: true });
  const deferredRouteSearch = useDeferredValue(routeSearch.trim().toLowerCase());

  const toggleSection = (section) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const { data } = await getRoutes();
      setRoutes(data.routes);
      setAvailableStops(data.availableStops || []);
      setDrivers(data.drivers);
      setVehicles(data.vehicles);
      setSelectedRoute((current) => data.routes.find((route) => route.id === current?.id) || data.routes[0] || null);
    } catch {
      setError("No se pudieron cargar las rutas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // La carga asíncrona sincroniza el estado con la API al montar la vista.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoutes();
  }, []);

  const coordinates = selectedRoute?.coordinates || [];
  const filteredUnassignedStops = useMemo(() => availableStops.filter((stop) => [stop.guideNumber, stop.clientName, stop.address].filter(Boolean).join(" ").toLowerCase().includes(unassignedSearch.trim().toLowerCase())), [availableStops, unassignedSearch]);
  const filteredRoutes = useMemo(() => routes.filter((route) => {
    const searchable = [route.documentNumber, route.driverName, route.destination, ...(route.stops || []).map((stop) => stop.guideNumber)].filter(Boolean).join(" ").toLowerCase();
    const routeDates = [route.date, route.deliveryDate].filter(Boolean);
    const matchesDate = (!routeFromDate || routeDates.some((date) => date >= routeFromDate)) && (!routeToDate || routeDates.some((date) => date <= routeToDate));
    return matchesDate && (!deferredRouteSearch || searchable.includes(deferredRouteSearch));
  }), [routes, routeFromDate, routeToDate, deferredRouteSearch]);
  const selectedStops = useMemo(() => selectedRoute?.stops || [], [selectedRoute]);
  const groupedStops = useMemo(() => {
    const groups = new Map();

    selectedStops.forEach((stop) => {
      const key = `${stop.client || "Punto de descarga"}::${stop.address || "Sin dirección"}`;
      const current = groups.get(key) || {
        id: key,
        client: stop.client || "Punto de descarga",
        address: stop.address || "Sin dirección",
        documents: [],
        status: stop.status || selectedRoute?.status || "pending",
      };

      if (stop.guideNumber) {
        current.documents.push(stop.guideNumber);
      }

      groups.set(key, current);
    });

    return Array.from(groups.values()).map((group, index) => ({
      ...group,
      sequence: index + 1,
      documents: [...new Set(group.documents)],
    }));
  }, [selectedRoute, selectedStops]);

  const selectRoute = (route) => {
    setSelectedRoute(route);
    setEditingId(route.id);
    setForm({
      date: route.date || initialForm.date,
      startTime: route.startTime || initialForm.startTime,
      origin: route.origin || "",
      destination: route.destination || "",
      driverId: route.driverId ? String(route.driverId) : "",
      vehicleId: route.vehicleId ? String(route.vehicleId) : "",
      weightKg: route.weightKg || "",
      volumeM3: route.volumeM3 || "",
      deliveryDate: route.deliveryDate || "",
      stops: normalizeFormStops(route.stops || []),
    });
  };

  const handleAddStop = () => {
    setForm((current) => ({
      ...current,
      stops: [...(current.stops || []), { id: null, client: "Punto de descarga", address: "", guideNumber: "", status: "pending" }],
    }));
  };

  const handleDriverChange = (driverId) => {
    setForm((current) => {
      const driver = drivers.find((item) => item.id === Number(driverId));
      return {
        ...current,
        driverId,
        vehicleId: editingId ? current.vehicleId : driver?.defaultVehicleId ? String(driver.defaultVehicleId) : "",
      };
    });
  };

  const buildRoutePayload = (nextStops = form.stops) => ({
    ...form,
    driverId: form.driverId || null,
    vehicleId: form.vehicleId || null,
    startTime: form.startTime,
    stops: (nextStops || []).map((stop) => ({
      id: stop.id ?? null,
      client: (stop.client || "Punto de descarga").trim(),
      address: (stop.address || "").trim(),
      guideNumber: (stop.guideNumber || "").trim(),
      status: stop.status || "pending",
    })),
  });

  const handleAssignAvailableStop = async (stop) => {
    if (!editingId || !selectedRoute) {
      setError("Selecciona una ruta existente antes de asociar una entrega.");
      return;
    }
    if (!["draft", "planned"].includes(selectedRoute.status)) {
      setError("Solo puedes asociar entregas a rutas en borrador o planificadas.");
      return;
    }

    const nextStop = { id: stop.id, client: stop.clientName, address: stop.address, guideNumber: stop.guideNumber || "", status: selectedRoute.status === "planned" ? "planned" : "pending" };
    const nextStops = [...(form.stops || []), nextStop];
    setSaving(true);
    setError("");
    try {
      await updateRoute(editingId, buildRoutePayload(nextStops));
      setForm((current) => ({ ...current, stops: nextStops }));
      await loadRoutes();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo asociar la entrega a la ruta.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStop = (index, field, value) => {
    setForm((current) => ({
      ...current,
      stops: (current.stops || []).map((stop, stopIndex) => (stopIndex === index ? { ...stop, [field]: value } : stop)),
    }));
  };

  const handleRemoveStop = (index) => {
    setForm((current) => ({
      ...current,
      stops: (current.stops || []).filter((_, stopIndex) => stopIndex !== index),
    }));
  };

  const submitRoute = async (event) => {
    if (event) event.preventDefault();
    if (editingId && selectedRoute && hasRouteChanges(selectedRoute, form)) {
      const confirmed = window.confirm("Hay cambios en la ruta. ¿Deseas guardar los puntos de descarga y los datos modificados?");
      if (!confirmed) {
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const nextPayload = buildRoutePayload();
      if (editingId) await updateRoute(editingId, nextPayload);
      else await createRoute(nextPayload);
      setForm(initialForm);
      setEditingId(null);
      await loadRoutes();
    } catch {
      setError(editingId ? "No se pudieron guardar los cambios de la ruta." : "No se pudo crear la ruta.");
    } finally {
      setSaving(false);
    }
  };

  const buildRouteFormState = (route) => ({
    date: route?.date || initialForm.date,
    startTime: route?.startTime || initialForm.startTime,
    origin: route?.origin || "",
    destination: route?.destination || "",
    driverId: route?.driverId ? String(route.driverId) : "",
    vehicleId: route?.vehicleId ? String(route.vehicleId) : "",
    weightKg: route?.weightKg || "",
    volumeM3: route?.volumeM3 || "",
    deliveryDate: route?.deliveryDate || "",
    stops: normalizeFormStops(route?.stops || []),
  });

  const hasRouteChanges = (route, currentForm) => {
    if (!route) return false;
    const nextForm = buildRouteFormState(route);
    return JSON.stringify({
      ...nextForm,
      stops: (currentForm.stops || []).map((stop) => ({
        id: stop.id ?? null,
        client: (stop.client || "Punto de descarga").trim(),
        address: (stop.address || "").trim(),
        guideNumber: (stop.guideNumber || "").trim(),
        status: stop.status || "pending",
      })),
    }) !== JSON.stringify({
      ...nextForm,
      stops: (nextForm.stops || []).map((stop) => ({
        id: stop.id ?? null,
        client: (stop.client || "Punto de descarga").trim(),
        address: (stop.address || "").trim(),
        guideNumber: (stop.guideNumber || "").trim(),
        status: stop.status || "pending",
      })),
    });
  };

  const handleSubmit = async (event) => {
    await submitRoute(event);
  };

  const handleDelete = async () => {
    if (!selectedRoute || !window.confirm("¿Eliminar esta ruta y sus asignaciones?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteRoute(selectedRoute.id);
      setSelectedRoute(null);
      setEditingId(null);
      setForm(initialForm);
      await loadRoutes();
    } catch {
      setError("No se pudo eliminar la ruta.");
    } finally {
      setSaving(false);
    }
  };

  const handleOptimize = async () => {
    if (!selectedRoute) return;
    setError("");
    try {
      await optimizeRoute(selectedRoute.id);
      await loadRoutes();
    } catch {
      setError("No se pudo optimizar la ruta.");
    }
  };

  const handleStatus = async (status) => {
    if (!selectedRoute) return;
    try {
      await updateRoute(selectedRoute.id, { status });
      await loadRoutes();
    } catch {
      setError("No se pudo actualizar el estado.");
    }
  };

  return (
    <section className="route-planner-page">
      <div className="route-planner-heading">
        <div>
          <p className="eyebrow">Administración operativa</p>
          <h2>Planificador de rutas</h2>
          <p>Crea recorridos, asigna conductores y organiza las cargas del camión antes de enviarlas a operación.</p>
        </div>
        <button className="primary-action" onClick={handleOptimize} disabled={!selectedRoute || saving} type="button">
          Optimizar ruta
        </button>
      </div>

      {error && <p className="route-error" role="alert">{error}</p>}

      <div className="route-filter-bar">
        <label className="route-filter-search">Buscar ruta, conductor o guía<input value={routeSearch} onChange={(event) => setRouteSearch(event.target.value)} placeholder="Ej. Ruta 18-08, Camila o GD-0001" /></label>
        <label>Desde<input type="date" value={routeFromDate} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => setRouteFromDate(event.target.value)} /></label>
        <label>Hasta<input type="date" value={routeToDate} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => setRouteToDate(event.target.value)} /></label>
        {(routeSearch || routeFromDate || routeToDate) && <button className="secondary-action small" onClick={() => { setRouteSearch(""); setRouteFromDate(""); setRouteToDate(""); }} type="button">Limpiar</button>}
      </div>

      <div className="route-planner-grid">
        <aside className="route-planner-sidebar">
          <button type="button" className="panel-heading accordion-trigger" aria-expanded={expandedSections.routes} onClick={() => toggleSection("routes")}>
            <div>
              <p className="eyebrow">Planificación</p>
              <h3>Rutas creadas</h3>
            </div>
            <span className="accordion-badge">{routes.length}</span>
            <span className="accordion-icon">{expandedSections.routes ? "−" : "+"}</span>
          </button>
          {expandedSections.routes && (loading ? <p>Cargando rutas...</p> : <RouteList routes={filteredRoutes} selectedId={selectedRoute?.id} onSelect={selectRoute} />)}

          <button type="button" className="panel-heading accordion-trigger route-unassigned-heading" aria-expanded={expandedSections.unassigned} onClick={() => toggleSection("unassigned")}>
            <div><p className="eyebrow">Sin asignar</p><h3>Entregas disponibles</h3></div>
            <span className="accordion-badge">{availableStops.length}</span>
            <span className="accordion-icon">{expandedSections.unassigned ? "−" : "+"}</span>
          </button>
          {expandedSections.unassigned && <div className="route-unassigned-list">
            <label>Buscar entrega<input value={unassignedSearch} onChange={(event) => setUnassignedSearch(event.target.value)} placeholder="Guía, cliente o dirección" /></label>
            {!editingId && <p className="route-field-help">Selecciona una ruta existente para asignar entregas disponibles.</p>}
            {filteredUnassignedStops.length ? filteredUnassignedStops.map((stop) => <article key={stop.id}><div><strong>{stop.guideNumber || "Sin guía"}</strong><small>{stop.clientName || "Cliente sin nombre"}</small><small>{stop.address}</small></div><button className="secondary-action small" disabled={!editingId || saving || !["draft", "planned"].includes(selectedRoute?.status)} onClick={() => handleAssignAvailableStop(stop)} type="button">{saving ? "Asignando..." : "Asignar"}</button></article>) : <p className="route-field-help">No hay entregas sin asignar.</p>}
          </div>}
        </aside>

        <div className="route-planner-workspace">
          <form className="route-form" onSubmit={handleSubmit}>
            <button type="button" className="panel-heading accordion-trigger" aria-expanded={expandedSections.form} onClick={() => toggleSection("form")}>
              <div>
                <p className="eyebrow">{editingId ? "Editar ruta" : "Nueva ruta"}</p>
                <h3>Configurar recorrido</h3>
              </div>
              <span className="accordion-icon">{expandedSections.form ? "−" : "+"}</span>
            </button>
            {expandedSections.form && (
              <>
                <div className="route-form-fields">
                  <label>Fecha de planificación<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
                  <label>Fecha de entrega<input type="date" value={form.deliveryDate} onChange={(event) => setForm({ ...form, deliveryDate: event.target.value })} /></label>
                  <label>Conductor<select required value={form.driverId} onChange={(event) => handleDriverChange(event.target.value)}><option value="">Seleccionar conductor</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
                  <label>Camión / patente<select required value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}><option value="">Seleccionar patente</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate} · {vehicle.name}</option>)}</select></label>
                </div>
                <div className="route-form-fields"><label>Origen<input required value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} placeholder="Ej. Av. Presidente Kennedy 9000, Santiago" /><small className="route-field-help">Dirección de origen para la ruta.</small></label><label>Destino<input required value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="Ej. Av. Apoquindo 3000, Las Condes" /><small className="route-field-help">Destino de la ruta y optimización del recorrido.</small></label></div>
                <div className="route-form-fields"><label>Peso de carga (kg)<input min="0" step="0.01" type="number" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} placeholder="Ej. 2400" /></label><label>Volumen de carga (m3)<input min="0" step="0.001" type="number" value={form.volumeM3} onChange={(event) => setForm({ ...form, volumeM3: event.target.value })} placeholder="Ej. 18" /></label></div>
                <label>Hora de inicio<input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>

                <div className="route-stop-editor">
                  <button type="button" className="panel-heading accordion-trigger" aria-expanded={expandedSections.stops} onClick={() => toggleSection("stops")}>
                    <div>
                      <p className="eyebrow">Puntos de descarga</p>
                      <h3>Editar puntos</h3>
                    </div>
                    <span className="accordion-badge">{form.stops.length}</span>
                    <span className="accordion-icon">{expandedSections.stops ? "−" : "+"}</span>
                  </button>

                  {expandedSections.stops && (
                    <>
                      <div className="route-stop-editor-header">
                        <h4>Puntos de descarga</h4>
                        <button className="secondary-action small" onClick={handleAddStop} type="button">Agregar punto</button>
                      </div>

                      {form.stops.length === 0 ? (
                        <p className="route-field-help">Sin puntos agregados aún. Puedes agregar uno desde aquí.</p>
                      ) : (
                        <div className="route-stop-editor-list">
                          {form.stops.map((stop, index) => (
                            <div className="route-stop-editor-item" key={`${stop.id ?? "new"}-${index}`}>
                              <div className="route-form-fields compact">
                                <label>Cliente<input value={stop.client} onChange={(event) => handleUpdateStop(index, "client", event.target.value)} placeholder="Nombre del punto" /></label>
                                <label>Guía / documento<input value={stop.guideNumber} onChange={(event) => handleUpdateStop(index, "guideNumber", event.target.value)} placeholder="GD-0001" /></label>
                              </div>
                              <label>Dirección<input value={stop.address} onChange={(event) => handleUpdateStop(index, "address", event.target.value)} placeholder="Dirección completa" /></label>
                              <div className="route-stop-editor-actions">
                                <select value={stop.status || "pending"} onChange={(event) => handleUpdateStop(index, "status", event.target.value)}>
                                  {deliveryStatusOptions.filter((option) => stop.id == null ? option.value === "pending" : getAllowedDeliveryStatuses(stop.status).includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                                <button className="danger-action small" onClick={() => handleRemoveStop(index)} type="button">Quitar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <small className="route-field-help">Estos valores quedan abiertos en el flujo de planificación y se usan para la programación del conductor sin bloquear la operación por ahora.</small>
                <div className="route-detail-actions">
                  <button className="primary-action" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear ruta"}</button>
                </div>
              </>
            )}
          </form>

          <div className="route-detail-panel">
            {selectedRoute ? <>
              <div className="panel-heading"><div><p className="eyebrow">Ruta seleccionada</p><h3>{selectedRoute.documentNumber || `Ruta #${selectedRoute.id}`}</h3><small>{selectedRoute.vehicleName} · {selectedRoute.driverName} · {selectedRoute.date} {selectedRoute.startTime}</small><small>{selectedRoute.origin} → {selectedRoute.destination}</small></div><div className="route-detail-actions"><select value={selectedRoute.status} onChange={(event) => handleStatus(event.target.value)}>{routeStatusOptions.filter((status) => routeTransitions[selectedRoute.status]?.includes(status.value)).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button className="danger-action" onClick={handleDelete} type="button">Eliminar</button></div></div>
              <MapView coordinates={coordinates} />
              <div className="route-stops">
                <h4>Puntos de descarga</h4>
                {groupedStops.map((stop, index) => {
                  const stopStatus = stop.status || selectedRoute.status || "pending";
                  const badgeText = stop.documents.length > 0 ? stop.documents.join(", ") : "Sin guía asociada";

                  return (
                    <div className="route-stop" key={stop.id ?? `${selectedRoute.id}-${index}`}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>
                        <strong>{stop.client}</strong>
                        <small>{stop.address}</small>
                        <small className="route-stop-documents">Guías: {badgeText}</small>
                      </span>
                      <em>{formatRouteStatusLabel(stopStatus)}</em>
                    </div>
                  );
                })}
              </div>
            </> : <p>Selecciona una ruta para revisar sus cargas asignadas.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
