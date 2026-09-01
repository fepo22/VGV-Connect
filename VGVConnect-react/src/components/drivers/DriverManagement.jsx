import { useEffect, useState } from "react";
import { createDriver, deleteDriver, getDrivers, updateDriver } from "../../api/admin-drivers.api";

const emptyForm = { name: "", username: "", defaultVehicleId: "" };

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const loadDrivers = async () => {
    const { data } = await getDrivers();
    setDrivers(data.drivers);
    setVehicles(data.vehicles);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDrivers().catch(() => setError("No se pudo cargar la mantención de conductores."));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreatedCredentials(null);
    try {
      const payload = { ...form, defaultVehicleId: form.defaultVehicleId || null };
      if (editingId) {
        await updateDriver(editingId, payload);
      } else {
        const { data } = await createDriver(payload);
        setCreatedCredentials({ username: data.username, temporaryPassword: data.temporaryPassword });
      }
      await loadDrivers();
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo guardar el conductor.");
    } finally {
      setSaving(false);
    }
  };

  const editDriver = (driver) => {
    setEditingId(driver.id);
    setError("");
    setCreatedCredentials(null);
    setForm({ name: driver.name, username: driver.username, defaultVehicleId: driver.defaultVehicleId ? String(driver.defaultVehicleId) : "" });
  };

  const removeDriver = async (driver) => {
    if (!window.confirm(`¿Eliminar a ${driver.name}?`)) return;
    setError("");
    try {
      await deleteDriver(driver.id);
      if (editingId === driver.id) resetForm();
      await loadDrivers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo eliminar el conductor.");
    }
  };

  return (
    <section className="driver-management">
      <div className="panel-heading"><div><p className="eyebrow">Administración</p><h3>Mantención de conductores</h3></div><span>{drivers.length}</span></div>
      {error && <p className="route-error" role="alert">{error}</p>}
      {createdCredentials && (
        <div className="driver-credential-card" role="status">
          <div><small>Credencial provisoria</small><strong>@{createdCredentials.username}</strong></div>
          <span>{createdCredentials.temporaryPassword}</span>
          <p>Pídele al conductor que cambie esta clave al iniciar sesión.</p>
        </div>
      )}
      <form className="driver-management-form" onSubmit={handleSubmit}>
        <div className="driver-management-form-title"><p className="eyebrow">{editingId ? "Edición" : "Alta"}</p><h4>{editingId ? "Editar conductor" : "Nuevo conductor"}</h4></div>
        <label>Nombre<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Usuario<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
        <label>Patente predeterminada<select value={form.defaultVehicleId} onChange={(event) => setForm({ ...form, defaultVehicleId: event.target.value })}><option value="">Sin patente predeterminada</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate} · {vehicle.name}</option>)}</select></label>
        <div className="driver-management-actions"><button className="primary-action" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear conductor"}</button>{editingId && <button className="secondary-action" onClick={resetForm} type="button">Cancelar</button>}</div>
      </form>
      <div className="driver-management-list">{drivers.map((driver) => <article key={driver.id}><div className="driver-management-avatar">{driver.name.slice(0, 2).toUpperCase()}</div><div><strong>{driver.name}</strong><small>@{driver.username}</small><small>{driver.defaultVehicle ? `${driver.defaultVehicle.licensePlate} · ${driver.defaultVehicle.name}` : "Sin patente predeterminada"}</small></div><div><button className="secondary-action small" onClick={() => editDriver(driver)} type="button">Editar</button><button className="danger-action small" onClick={() => removeDriver(driver)} type="button">Eliminar</button></div></article>)}</div>
    </section>
  );
}