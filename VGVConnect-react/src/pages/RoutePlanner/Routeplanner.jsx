import React, { useState, useEffect, useRef } from "react";
import RouteList from "../../components/deliveries/RouteList";
import MapView from "../../components/maps/Mapview";
import DeliveryDetail from "../../components/deliveries/DeliveryDetail";
import { getDrivers } from "../../api/drivers.api";
import { getVehicles } from "../../api/vehicles.api";
import { getClients, getClientAddresses, createClientAddress, createClient } from "../../api/clients.api";
import { createOrder, getOrders, updateOrderStatus } from "../../api/orders.api";
import { useToast } from "../../components/ui/ToastContext";

const sectionStyle = {
  background: "#fff",
  padding: "24px",
  borderRadius: "22px",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  alignItems: "stretch",
};

const cardContentStyle = {
  display: "grid",
  gap: "18px",
  width: "100%",
  maxWidth: "100%",
  margin: "0",
};

const fieldGroupStyle = {
  display: "grid",
  gap: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: "14px",
  border: "1px solid #d6dde8",
  fontSize: "0.96rem",
  boxSizing: "border-box",
  minWidth: 0,
};

export default function Routeplanner() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [coordinates, setCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientAddresses, setClientAddresses] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [form, setForm] = useState({
    reference: "",
    clientId: "",
    clientName: "",
    addressId: "",
    addressText: "",
    driverId: "",
    vehicleId: "",
    scheduledAt: "",
    latitude: "",
    longitude: "",
  });
  const [saving, setSaving] = useState(false);
  const clientSearchTimer = useRef(null);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [mapPanTo, setMapPanTo] = useState(null);

  const mapOrders = (orders) =>
    orders.map((order, index) => {
      const lat = order.address?.latitude ?? null;
      const lng = order.address?.longitude ?? null;
      return {
        id: order.id,
        reference: order.reference || `GD-${order.id}`,
        client: order.client?.name || "Cliente desconocido",
        address: order.address ? `${order.address.street}, ${order.address.city}` : "Dirección no disponible",
        status: order.status,
        driver: order.driver?.name || "Sin chofer",
        vehicle: order.vehicle?.licensePlate || "Sin patente",
        eta: order.scheduledAt ? new Date(order.scheduledAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "Por definir",
        sequence: index + 1,
        location: lat && lng ? { lat, lng } : null,
        geoPoint: lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "No disponible",
        rawOrder: order,
      };
    });

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const orders = await getOrders();
      const mapped = mapOrders(orders);
      setRoutes(mapped);
      setCoordinates(mapped.filter((route) => route.location).map((route) => route.location));
    } catch (error) {
      console.error("Error cargando órdenes:", error);
      setRoutes([]);
      setCoordinates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderData = async () => {
    const provisionalDrivers = [
      { id: -1, name: "Nicolas Alvarez" },
      { id: -2, name: "Alejandro Campos" },
      { id: -3, name: "Mauricio Solis" },
      { id: -4, name: "Roberto Saavedra" },
      { id: -5, name: "Luis Seal" },
      { id: -6, name: "Luis Torres" },
      { id: -7, name: "Tolentino Santos" },
    ];

    const provisionalVehicles = [
      { id: -11, licensePlate: "Rjsj22" },
      { id: -12, licensePlate: "Swgr35" },
    ];

    let driversData = [];
    let vehiclesData = [];
    let clientsData = [];

    try {
      driversData = await getDrivers();
      if (!Array.isArray(driversData)) driversData = [];
    } catch (e) {
      console.warn("getDrivers failed, using provisional drivers", e);
      driversData = [];
    }

    try {
      vehiclesData = await getVehicles();
      if (!Array.isArray(vehiclesData)) vehiclesData = [];
    } catch (e) {
      console.warn("getVehicles failed, using provisional vehicles", e);
      vehiclesData = [];
    }

    try {
      clientsData = await getClients();
      if (!Array.isArray(clientsData)) clientsData = [];
    } catch (e) {
      console.warn("getClients failed, continuing with empty clients list", e);
      clientsData = [];
    }

    const mergedDrivers = [...driversData];
    provisionalDrivers.forEach((pd) => {
      if (!mergedDrivers.find((d) => d.name === pd.name)) mergedDrivers.push(pd);
    });

    const mergedVehicles = [...vehiclesData];
    provisionalVehicles.forEach((pv) => {
      if (!mergedVehicles.find((v) => v.licensePlate === pv.licensePlate)) mergedVehicles.push(pv);
    });

    setDrivers(mergedDrivers);
    setVehicles(mergedVehicles);
    setClients(clientsData);
  };

  useEffect(() => {
    loadRoutes();
    loadOrderData();
  }, []);

  const toast = useToast();

  const handleClientChange = async (event) => {
    const clientId = event.target.value;
    setForm((prev) => ({ ...prev, clientId, addressId: "" }));
    if (!clientId) {
      setClientAddresses([]);
      return;
    }

    const addresses = await getClientAddresses(clientId);
    setClientAddresses(addresses);
  };

  const handleClientInputChange = async (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, clientName: value, clientId: "", addressId: "" }));

    if (value && value.length >= 2) {
      if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
      clientSearchTimer.current = setTimeout(async () => {
        try {
          const results = await getClients(value);
          setClients(results);
        } catch (e) {
          console.error("Error buscando clientes:", e);
        }
      }, 300);
    } else {
      if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
      // if cleared, reload base clients
      try {
        const all = await getClients();
        setClients(all);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapClick = (latlng) => {
    setSelectedLocation(latlng);
    setForm((prev) => ({ ...prev, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) }));

    (async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
        const json = await res.json();
        if (json && json.display_name) {
          setForm((prev) => ({ ...prev, addressText: json.display_name }));
        }
      } catch (e) {
        console.error("Reverse geocode failed", e);
      }
    })();
  };

  const handleMapSearch = async () => {
    if (!mapSearchQuery || mapSearchQuery.length < 3) return;
    try {
      const q = encodeURIComponent(mapSearchQuery);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=6`);
      const json = await res.json();
      setMapSearchResults(json);
    } catch (e) {
      console.error("Search error", e);
    }
  };

  const handleMapSearchSelect = (item) => {
    if (!item) return;
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setMapPanTo({ lat, lng, zoom: 16 });
    setSelectedLocation({ lat, lng });
    setForm((prev) => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6), addressText: item.display_name }));
    setMapSearchResults([]);
    setMapSearchQuery("");
  };

  const handleSaveRoute = async () => {
    if (!form.reference || (!form.clientId && !form.clientName) || !form.driverId || !form.vehicleId || !form.scheduledAt) {
      toast.addToast("Completa los campos obligatorios: guía, cliente (o nombre), chofer, patente y hora de salida.", "error");
      return;
    }

    if (!form.addressId && (!form.latitude || !form.longitude)) {
      toast.addToast("Debes seleccionar una dirección guardada o un punto de georeferencia en el mapa.", "error");
      return;
    }

    setSaving(true);
    try {
      let addressId = form.addressId;

      // If there's no clientId but a clientName, create the client first
      if (!form.clientId && form.clientName) {
        try {
          const newClient = await createClient({ name: form.clientName });
          if (newClient && newClient.id) {
            form.clientId = newClient.id;
          }
        } catch (e) {
          console.error("Error creando cliente:", e);
        }
      }

      if (!addressId && form.clientId) {
        const address = await createClientAddress(Number(form.clientId), {
          label: `Geo ${form.latitude}, ${form.longitude}`,
          street: form.addressText || `Ubicación ${form.latitude}, ${form.longitude}`,
          city: "Georeferencia",
          state: "",
          postalCode: "",
          country: "Chile",
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        });
        addressId = address.id;
      }

      const payload = {
        reference: form.reference,
        driverId: Number(form.driverId),
        vehicleId: Number(form.vehicleId),
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        status: "planned",
      };

      if (form.clientId) payload.clientId = Number(form.clientId);
      else payload.clientName = form.clientName;

      payload.addressId = addressId ? Number(addressId) : null;
      if (!addressId && form.addressText) {
        payload.addressText = form.addressText;
        payload.latitude = form.latitude ? Number(form.latitude) : null;
        payload.longitude = form.longitude ? Number(form.longitude) : null;
      }

      const created = await createOrder(payload);

      setForm({
        reference: "",
        clientId: "",
        clientName: "",
        addressId: "",
        driverId: "",
        vehicleId: "",
        scheduledAt: "",
        latitude: "",
        longitude: "",
      });
      setSelectedLocation(null);
      setClientAddresses([]);
      // If backend returned enriched order, prepend it to the routes list
      if (created) {
        try {
          const mapped = mapOrders([created])[0];
          setRoutes((prev) => [mapped, ...prev]);
          setCoordinates((prev) => (mapped.location ? [mapped.location, ...prev] : prev));
        } catch (e) {
          // fallback to full reload
          await loadRoutes();
        }
      } else {
        await loadRoutes();
      }

      toast.addToast("Ruta programada con éxito", "info");
    } catch (error) {
        console.error(error);
        const msg = error?.response?.data?.message || error.message || "Error al guardar la ruta";
        toast.addToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    (async () => {
      if (!selectedRoute || !selectedRoute.rawOrder) {
        toast.addToast("No hay ruta seleccionada", "error");
        return;
      }
      try {
        const updated = await updateOrderStatus(selectedRoute.rawOrder.id, "delivered", { deliveredBy: null });
        // update routes state
        setRoutes((prev) => prev.map((r) => (r.id === updated.id ? mapOrders([updated])[0] : r)));
        toast.addToast(`Entrega confirmada: ${updated.client?.name || updated.clientName || selectedRoute.client}`, "info");
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || "Error al confirmar entrega";
        toast.addToast(msg, "error");
      } finally {
        setSelectedRoute(null);
      }
    })();
  };

  return (
    <div style={{ padding: "22px 24px 30px", width: "100%", maxWidth: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      <div className="routeplanner-header" style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          <h1 style={{ marginBottom: "8px", fontSize: "2rem" }}>📍 Planificador de rutas</h1>
          <p style={{ marginTop: 0, color: "#555", lineHeight: 1.6 }}>
            Ingresa una programación de ruta con guía de despacho, empresa, georeferencia, chofer y patente asignados.
          </p>
        </div>
        <button
          onClick={loadRoutes}
          style={{
            border: "none",
            background: "#2d88ff",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 20px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Cargando..." : "Actualizar rutas"}
        </button>
      </div>

      <div className="routeplanner-grid" style={{ display: "grid", gridTemplateColumns: "0.95fr 1.35fr", gap: "24px", marginTop: "24px", alignItems: "flex-start", minWidth: 0 }}>
        <div>
          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, letterSpacing: "0.02em", color: "#0f172a" }}>Nueva ruta</h2>
            <div style={{ ...cardContentStyle, paddingTop: "4px" }}>
              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>N° guía de despacho</label>
                <input
                  name="reference"
                  value={form.reference}
                  onChange={handleChange}
                  placeholder="Ej: GD-12345"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>Empresa / Cliente</label>
                <input
                  name="clientName"
                  list="clients-list"
                  value={form.clientName}
                  onChange={handleClientInputChange}
                  placeholder="Escribe o selecciona un cliente"
                  style={inputStyle}
                />
                <datalist id="clients-list">
                  {clients.map((client) => (
                    <option key={client.id} value={client.name} />
                  ))}
                </datalist>
              </div>

              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>Punto de georeferencia</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input
                    name="latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="Latitud"
                    style={inputStyle}
                  />
                  <input
                    name="longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="Longitud"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>Dirección / punto guardado</label>
                <select
                  name="addressId"
                  value={form.addressId}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={!clientAddresses.length}
                >
                  <option value="">Selecciona una dirección</option>
                  {clientAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} - {address.street}, {address.city}
                    </option>
                  ))}
                </select>
                <input
                  name="addressText"
                  value={form.addressText}
                  onChange={handleChange}
                  placeholder="Dirección (puede autocompletarse al hacer clic en el mapa)"
                  style={{ ...inputStyle, marginTop: "8px" }}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>Chofer asignado</label>
                <select
                  name="driverId"
                  value={form.driverId}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Selecciona un chofer</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>Patente del camión</label>
                <select
                  name="vehicleId"
                  value={form.vehicleId}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Selecciona un vehículo</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={{ fontWeight: 700, color: "#1f2937" }}>Hora estimada de salida</label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={form.scheduledAt}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <button
                onClick={handleSaveRoute}
                disabled={saving}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  cursor: "pointer",
                  marginTop: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                }}
              >
                {saving ? "Guardando..." : "Guardar programación"}
              </button>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, letterSpacing: "0.02em", color: "#0f172a" }}>Rutas programadas</h2>
            <RouteList routes={routes} onOptimize={loadRoutes} onSelect={setSelectedRoute} />
          </div>
        </div>

        <div style={{ display: "grid", gap: "24px", gridTemplateRows: "auto 1fr" }}>
          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, letterSpacing: "0.02em", color: "#0f172a" }}>Resumen de la ruta</h2>
            <div style={{ display: "grid", gap: "12px", color: "#334155" }}>
              <p style={{ margin: 0 }}>
                <strong>Total de paradas:</strong> {routes.length}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Estado de carga:</strong> {loading ? "Cargando..." : "Listas"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Ruta activa:</strong> {selectedRoute ? selectedRoute.client : "Selecciona una parada"}
              </p>
            </div>
          </div>

          <div style={{ ...sectionStyle, padding: "18px" }}>
            <h2 style={{ marginTop: 0, letterSpacing: "0.02em", color: "#0f172a" }}>Mapa de ruta</h2>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                placeholder="Buscar calle, dirección..."
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleMapSearch} style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#2d88ff", color: "#fff" }}>Buscar</button>
            </div>
            {mapSearchResults && mapSearchResults.length ? (
              <div style={{ maxHeight: 160, overflow: "auto", marginBottom: 8, background: "#fff", borderRadius: 8, padding: 8 }}>
                {mapSearchResults.map((r) => (
                  <div key={r.place_id} style={{ padding: 6, cursor: "pointer", borderBottom: "1px solid #eee" }} onClick={() => handleMapSearchSelect(r)}>
                    <div style={{ fontWeight: 700 }}>{r.display_name.split(",")[0]}</div>
                    <div style={{ fontSize: 12, color: "#556" }}>{r.display_name}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <MapView coordinates={coordinates} onMapClick={handleMapClick} selectedLocation={selectedLocation} panTo={mapPanTo} />
            <div style={{ marginTop: "12px", color: "#475569" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Ubicación seleccionada</p>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                {selectedLocation ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` : "Haz clic en el mapa para seleccionar un punto"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <DeliveryDetail route={selectedRoute} onConfirm={handleConfirm} onClose={() => setSelectedRoute(null)} />
      </div>

      <style>
        {`@media (max-width: 1220px) {
          .routeplanner-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 980px) {
          .routeplanner-header {
            flex-direction: column;
            align-items: stretch;
          }

          .routeplanner-header button {
            width: 100%;
          }
        }

        @media (max-width: 680px) {
          .routeplanner-grid > div {
            width: 100%;
          }

          .routeplanner-header {
            gap: 12px;
          }
        }

        /* Force columns to stretch and panels to use full width */
        .routeplanner-grid > div {
          width: 100%;
          align-self: stretch;
        }
        .routeplanner-grid > div > div {
          width: 100%;
        }
      `}
      </style>
    </div>
  );
}
