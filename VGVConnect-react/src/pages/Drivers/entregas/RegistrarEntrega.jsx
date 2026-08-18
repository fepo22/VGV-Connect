import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { registrarEntregaDriver, uploadDeliveryPhotoDriver } from "../../../api/drivers.api";
import useAuth from "../../../hooks/useAuth";

export default function RegistrarEntrega() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("completed");
  const [observations, setObservations] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const location = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 },
      ));
      if (status === "completed") {
        await registrarEntregaDriver(id, { status: "in_progress", driverId: user.id });
      }
      const { data } = await uploadDeliveryPhotoDriver(id, photoUrl);
      await registrarEntregaDriver(id, { status, photoUrl: data.url, location, observations, driverId: user.id, timestamp: new Date().toISOString() });
      navigate("/chofer");
    } catch {
      setError("No se pudo registrar la entrega. Revisa el permiso de ubicación.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="driver-form-page"><div><p className="eyebrow">Evidencia de entrega</p><h2>Registrar resultado</h2><p>La ubicación se captura al confirmar para mantener trazabilidad.</p></div><form className="driver-form" onSubmit={handleSubmit}><label>Resultado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="completed">Completado</option><option value="rejected">Rechazado</option><option value="not_found">No encontrado</option></select></label><label>Observaciones<textarea value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Describe cualquier incidencia" /></label><label>Foto de evidencia<input required accept="image/*" capture="environment" onChange={handlePhoto} type="file" /></label>{photoUrl && <img className="driver-photo-preview" src={photoUrl} alt="Vista previa de evidencia" />} {error && <p className="route-error" role="alert">{error}</p>}<button className="primary-action" disabled={saving} type="submit">{saving ? "Registrando..." : "Confirmar entrega"}</button></form></section>;
}
