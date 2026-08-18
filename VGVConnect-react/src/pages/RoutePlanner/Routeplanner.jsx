import { useEffect, useMemo, useState } from "react";
import RouteList from "../../components/deliveries/RouteList";
import MapView from "../../components/maps/Mapview";
import { createRoute, getRoutes, optimizeRoute, updateRoute } from "../../api/routes.api";

const initialForm = {
  name: "",
  date: new Date().toISOString().slice(0, 10),
  driverId: "",
  stopIds: [],
};

export default function Routeplanner() {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [availableStops, setAvailableStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const { data } = await getRoutes();
      setRoutes(data.routes);
      setDrivers(data.drivers);
      setAvailableStops(data.availableStops);
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
  const selectedStops = useMemo(() => selectedRoute?.stops || [], [selectedRoute]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRoute({
        ...form,
        driverId: form.driverId || null,
        stopIds: form.stopIds.length ? form.stopIds : undefined,
      });
      setForm(initialForm);
      await loadRoutes();
    } catch {
      setError("No se pudo crear la ruta.");
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
          <p>Crea recorridos, asigna choferes y ordena las paradas antes de enviarlas a operación.</p>
        </div>
        <button className="primary-action" onClick={handleOptimize} disabled={!selectedRoute || saving} type="button">
          Optimizar ruta
        </button>
      </div>

      {error && <p className="route-error" role="alert">{error}</p>}

      <div className="route-planner-grid">
        <aside className="route-planner-sidebar">
          <div className="panel-heading"><div><p className="eyebrow">Planificación</p><h3>Rutas creadas</h3></div><span>{routes.length}</span></div>
          {loading ? <p>Cargando rutas...</p> : <RouteList routes={routes} selectedId={selectedRoute?.id} onSelect={setSelectedRoute} />}
        </aside>

        <div className="route-planner-workspace">
          <form className="route-form" onSubmit={handleSubmit}>
            <div className="panel-heading"><div><p className="eyebrow">Nueva ruta</p><h3>Configurar recorrido</h3></div></div>
            <label>Nombre de la ruta<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Zona norte - tarde" /></label>
            <div className="route-form-fields">
              <label>Fecha<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
              <label>Chofer<select value={form.driverId} onChange={(event) => setForm({ ...form, driverId: event.target.value })}><option value="">Sin asignar</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
            </div>
            <fieldset className="route-stops-picker"><legend>Paradas incluidas</legend>{availableStops.map((stop) => <label key={stop.id}><input checked={form.stopIds.includes(stop.id)} onChange={(event) => setForm({ ...form, stopIds: event.target.checked ? [...form.stopIds, stop.id] : form.stopIds.filter((id) => id !== stop.id) })} type="checkbox" />{stop.client} · {stop.address}</label>)}</fieldset>
            <button className="secondary-action" disabled={saving} type="submit">{saving ? "Guardando..." : "Crear ruta"}</button>
          </form>

          <div className="route-detail-panel">
            {selectedRoute ? <>
              <div className="panel-heading"><div><p className="eyebrow">Ruta seleccionada</p><h3>{selectedRoute.name}</h3><small>{selectedRoute.driverName} · {selectedRoute.date}</small></div><select value={selectedRoute.status} onChange={(event) => handleStatus(event.target.value)}><option value="draft">Borrador</option><option value="planned">Planificada</option><option value="in_progress">En curso</option><option value="completed">Completada</option></select></div>
              <MapView coordinates={coordinates} />
              <div className="route-stops"><h4>Paradas del recorrido</h4>{selectedStops.map((stop) => <div className="route-stop" key={stop.id}><b>{String(stop.sequence).padStart(2, "0")}</b><span><strong>{stop.client}</strong><small>{stop.address}</small></span><em>{stop.status}</em></div>)}</div>
            </> : <p>Selecciona una ruta para revisar sus paradas.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
