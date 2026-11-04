import { useEffect, useState } from "react";
import { createDriver, deleteDriver, getDrivers, resetDriverPassword, updateDriver } from "../../api/admin-drivers.api";

const emptyForm = { name: "", username: "", defaultVehicleId: "" };
const emptyPasswords = { password: "", confirmation: "" };
const PASSWORD_MISMATCH = "La confirmación no coincide con la contraseña provisoria.";

// Mismos campos, reglas y avisos para el alta y la renovación de la clave provisoria.
function TemporaryPasswordFields({ value, onChange }) {
  return (
    <>
      <label>Clave provisoria<input autoComplete="new-password" minLength={8} required type="password" value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} /></label>
      <label>Confirmar clave provisoria<input autoComplete="new-password" minLength={8} required type="password" value={value.confirmation} onChange={(event) => onChange({ ...value, confirmation: event.target.value })} /></label>
      <p className="password-change-hint">Mínimo 8 caracteres; no puede ser común, secuencial ni contener el usuario o el nombre. No se volverá a mostrar: comunícasela al conductor por un canal seguro.</p>
    </>
  );
}

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [renewal, setRenewal] = useState(null);
  const [notice, setNotice] = useState("");

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
    setPasswords(emptyPasswords);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!editingId && passwords.password !== passwords.confirmation) {
      setError(PASSWORD_MISMATCH);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, defaultVehicleId: form.defaultVehicleId || null };
      if (editingId) {
        await updateDriver(editingId, payload);
      } else {
        const { data } = await createDriver({ ...payload, temporaryPassword: passwords.password, temporaryPasswordConfirmation: passwords.confirmation });
        setNotice(`Conductor @${data.username} creado. Deberá cambiar la clave provisoria al ingresar.`);
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
    setNotice("");
    setPasswords(emptyPasswords);
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

  const startRenewal = (driver) => {
    setError("");
    setNotice("");
    setRenewal({ driver, ...emptyPasswords, saving: false });
  };

  const submitRenewal = async (event) => {
    event.preventDefault();
    if (renewal.password !== renewal.confirmation) {
      setError(PASSWORD_MISMATCH);
      return;
    }
    if (!window.confirm(`¿Renovar la contraseña de ${renewal.driver.name}? Se cerrarán sus sesiones abiertas.`)) return;
    setError("");
    setRenewal({ ...renewal, saving: true });
    try {
      const { data } = await resetDriverPassword(renewal.driver.id, renewal.password, renewal.confirmation);
      setRenewal(null);
      setNotice(`Credencial de @${data.username} renovada. Sus sesiones abiertas se cerraron y deberá cambiar la clave provisoria al ingresar.`);
    } catch (requestError) {
      setRenewal((current) => current && { ...current, saving: false });
      setError(requestError.response?.data?.message || "No se pudo renovar la contraseña.");
    }
  };

  return (
    <section className="driver-management">
      <div className="panel-heading"><div><p className="eyebrow">Administración</p><h3>Mantención de conductores</h3></div><span>{drivers.length}</span></div>
      {error && <p className="route-error" role="alert">{error}</p>}
      {notice && <p className="password-change-success" role="status">{notice}</p>}
      {renewal && (
        <form className="driver-management-form" onSubmit={submitRenewal}>
          <div className="driver-management-form-title"><p className="eyebrow">Renovación</p><h4>Nueva clave provisoria para {renewal.driver.name}</h4></div>
          <TemporaryPasswordFields value={renewal} onChange={setRenewal} />
          <div className="driver-management-actions"><button className="primary-action" disabled={renewal.saving} type="submit">{renewal.saving ? "Renovando..." : "Renovar clave"}</button><button className="secondary-action" onClick={() => setRenewal(null)} type="button">Cancelar</button></div>
        </form>
      )}
      <form className="driver-management-form" onSubmit={handleSubmit}>
        <div className="driver-management-form-title"><p className="eyebrow">{editingId ? "Edición" : "Alta"}</p><h4>{editingId ? "Editar conductor" : "Nuevo conductor"}</h4></div>
        <label>Nombre<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Usuario<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
        <label>Patente predeterminada<select value={form.defaultVehicleId} onChange={(event) => setForm({ ...form, defaultVehicleId: event.target.value })}><option value="">Sin patente predeterminada</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate} · {vehicle.name}</option>)}</select></label>
        {!editingId && <TemporaryPasswordFields value={passwords} onChange={setPasswords} />}
        <div className="driver-management-actions"><button className="primary-action" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear conductor"}</button>{editingId && <button className="secondary-action" onClick={resetForm} type="button">Cancelar</button>}</div>
      </form>
      <div className="driver-management-list">{drivers.map((driver) => <article key={driver.id}><div className="driver-management-avatar">{driver.name.slice(0, 2).toUpperCase()}</div><div><strong>{driver.name}</strong><small>@{driver.username}</small><small>{driver.defaultVehicle ? `${driver.defaultVehicle.licensePlate} · ${driver.defaultVehicle.name}` : "Sin patente predeterminada"}</small></div><div><button className="secondary-action small" onClick={() => editDriver(driver)} type="button">Editar</button><button className="secondary-action small" onClick={() => startRenewal(driver)} type="button">Renovar clave</button><button className="danger-action small" onClick={() => removeDriver(driver)} type="button">Eliminar</button></div></article>)}</div>
    </section>
  );
}