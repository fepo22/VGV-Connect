import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { registrarEntregaDriver, uploadDeliveryPhotoDriver } from "../../../api/drivers.api";
import useAuth from "../../../hooks/useAuth";

export default function RegistrarEntrega() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("in_progress");
  const [observations, setObservations] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setError("No se pudo abrir la cámara. Revisa el permiso de cámara del dispositivo.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("No se pudo procesar la foto. Intenta nuevamente.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotoUrl(canvas.toDataURL("image/jpeg", 0.9));
    setError("");
    closeCamera();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!photoUrl) {
      setError("Debes tomar o adjuntar una foto como evidencia.");
      return;
    }

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

  return (
    <section className="driver-form-page">
      <div>
        <p className="eyebrow">Evidencia de entrega</p>
        <h2>Registrar resultado</h2>
        <p>La ubicación se captura al confirmar para mantener trazabilidad.</p>
      </div>

      <form className="driver-form" onSubmit={handleSubmit}>
        <label>
          Resultado
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="pending">Pendiente</option>
            <option value="planned">Planificado</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completado</option>
            <option value="rejected">Rechazado</option>
            <option value="not_found">No encontrado</option>
          </select>
        </label>

        <label>
          Observaciones
          <textarea value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Describe cualquier incidencia" />
        </label>

        <div className="driver-photo-field">
          <span>Foto de evidencia</span>
          <div className="driver-photo-actions">
            <button className="primary-action" disabled={cameraOpen} onClick={openCamera} type="button">
              {photoUrl ? "Tomar otra foto" : "Tomar foto"}
            </button>
            <button className="secondary-action" onClick={() => galleryInputRef.current?.click()} type="button">
              {photoUrl ? "Reemplazar imagen" : "Adjuntar imagen"}
            </button>
            {photoUrl && <button className="danger-action" onClick={() => setPhotoUrl("")} type="button">Quitar foto</button>}
          </div>
          <input ref={cameraInputRef} accept="image/*" capture="environment" className="driver-photo-input" onChange={handlePhoto} type="file" />
          <input ref={galleryInputRef} accept="image/*" className="driver-photo-input" onChange={handlePhoto} type="file" />
        </div>

        {cameraOpen && <div className="driver-camera" role="dialog" aria-label="Cámara de evidencia">
          <video ref={videoRef} autoPlay playsInline />
          <div className="driver-camera-actions">
            <button className="secondary-action" onClick={closeCamera} type="button">Cancelar</button>
            <button className="primary-action" onClick={capturePhoto} type="button">Capturar foto</button>
          </div>
        </div>}

        {photoUrl && <div className="driver-photo-confirmation">
          <img className="driver-photo-preview" src={photoUrl} alt="Vista previa de evidencia" />
          <span>Foto de evidencia lista para enviar.</span>
        </div>}
        {error && <p className="route-error" role="alert">{error}</p>}

        <button className="primary-action" disabled={saving} type="submit">
          {saving ? "Registrando..." : "Confirmar entrega"}
        </button>
      </form>
    </section>
  );
}
