import { useEffect, useMemo, useRef, useState } from "react";
import { getRoutes } from "../../api/routes.api";
import { getVehicleChecks, saveVehicleCheck } from "../../api/vehicle-checks.api";
import useAuth from "../../hooks/useAuth";

const today = new Date().toISOString().slice(0, 10);

const checklistSections = [
  {
    title: "Documentación",
    items: [
      ["license", "Licencia de conducir vigente"],
      ["circulationPermit", "Permiso de circulación"],
      ["technicalInspection", "Revisión técnica y gases"],
      ["soap", "Seguro obligatorio SOAP"],
      ["vehicleRegistration", "Padrón o certificado del vehículo"],
    ],
  },
  {
    title: "Seguridad obligatoria",
    items: [
      ["extinguisher", "Extintor cargado y vigente"],
      ["triangles", "Triángulos de seguridad"],
      ["reflectiveVest", "Chaleco reflectante"],
      ["firstAid", "Botiquín operativo"],
      ["spareWheel", "Rueda de repuesto y herramientas"],
    ],
  },
  {
    title: "Condición del vehículo",
    items: [
      ["lights", "Luces delanteras, traseras, freno e intermitentes"],
      ["tires", "Neumáticos, presión y desgaste"],
      ["brakes", "Frenos de servicio y estacionamiento"],
      ["mirrors", "Espejos, parabrisas y limpiaparabrisas"],
      ["horn", "Bocina y tablero sin alertas críticas"],
      ["fluids", "Aceite, refrigerante, combustible y fugas visibles"],
    ],
  },
  {
    title: "Carga y operación",
    items: [
      ["loadSecured", "Carga estibada y asegurada"],
      ["loadWeight", "Peso y volumen compatibles con el vehículo"],
      ["routeDocuments", "Documentos de carga/retiro disponibles"],
      ["phoneBattery", "Teléfono con batería y datos móviles"],
    ],
  },
];

const initialChecks = checklistSections.reduce((checks, section) => {
  section.items.forEach(([id]) => {
    checks[id] = { status: "pending", observation: "" };
  });
  return checks;
}, {});

const statusLabels = {
  ok: "OK",
  attention: "Atención",
  pending: "Pendiente",
};

const buildStorageKey = (userId, vehicleId) => `vgv-vehicle-check:${userId}:${vehicleId || "sin-vehiculo"}:${today}`;
const isSmokeTestPhoto = (value) => value === "data:image/jpeg;base64,Zm90bw==";

const readSavedCheck = (storageKey) => {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return { checks: initialChecks, odometer: "", odometerPhoto: "", observations: "", savedAt: "" };

  try {
    const parsed = JSON.parse(saved);
    return {
      checks: { ...initialChecks, ...(parsed.checks || {}) },
      odometer: parsed.odometer || "",
      odometerPhoto: isSmokeTestPhoto(parsed.odometerPhoto) ? "" : parsed.odometerPhoto || "",
      observations: parsed.observations || "",
      savedAt: parsed.savedAt || "",
    };
  } catch {
    return { checks: initialChecks, odometer: "", odometerPhoto: "", observations: "", savedAt: "" };
  }
};

const toCheckState = (check) => ({
  checks: { ...initialChecks, ...(check?.items || {}) },
  odometer: check?.odometer ?? "",
  odometerPhoto: isSmokeTestPhoto(check?.odometerPhotoUrl) ? "" : check?.odometerPhotoUrl || "",
  observations: check?.observations || "",
  savedAt: check?.updatedAt || check?.createdAt || "",
});

const isRenderableImage = (value) => value?.startsWith("data:image/") || value?.startsWith("blob:") || value?.startsWith("http");

export default function CheckVehiculo() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [checks, setChecks] = useState(initialChecks);
  const [odometer, setOdometer] = useState("");
  const [odometerPhoto, setOdometerPhoto] = useState("");
  const [observations, setObservations] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
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

  useEffect(() => {
    getRoutes(user.id)
      .then(async ({ data }) => {
        const nextRoutes = data.routes || [];
        const activeRoute = nextRoutes.find((route) => ["planned", "in_progress"].includes(route.status)) || nextRoutes[0];
        const nextVehicles = data.vehicles || [];
        const nextVehicle = nextVehicles.find((vehicle) => vehicle.licensePlate === activeRoute?.vehicleLicensePlate) || nextVehicles[0];
        const nextVehicleId = nextVehicle?.id ? String(nextVehicle.id) : "";
        const fallback = readSavedCheck(buildStorageKey(user.id, nextVehicleId));
        const savedResponse = nextVehicleId ? await getVehicleChecks({ vehicleId: nextVehicleId, date: today }) : null;
        const saved = savedResponse?.data?.checks?.[0] ? toCheckState(savedResponse.data.checks[0]) : fallback;
        setVehicles(nextVehicles);
        setSelectedVehicleId(nextVehicleId);
        setChecks(saved.checks);
        setOdometer(saved.odometer);
        setOdometerPhoto(saved.odometerPhoto);
        setPhotoPreviewError(false);
        setObservations(saved.observations);
        setSavedAt(saved.savedAt);
      })
      .catch(() => setError("No se pudieron cargar los vehículos o checks guardados."))
      .finally(() => setLoading(false));
  }, [user.id]);

  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === selectedVehicleId) || vehicles[0];
  const storageKey = buildStorageKey(user.id, selectedVehicle?.id || selectedVehicleId);

  const handleVehicleChange = (vehicleId) => {
    const saved = readSavedCheck(buildStorageKey(user.id, vehicleId));
    setSelectedVehicleId(vehicleId);
    setChecks(saved.checks);
    setOdometer(saved.odometer);
    setOdometerPhoto(saved.odometerPhoto);
    setPhotoPreviewError(false);
    setObservations(saved.observations);
    setSavedAt(saved.savedAt);
    if (vehicleId) {
      getVehicleChecks({ vehicleId, date: today })
        .then(({ data }) => {
          if (!data.checks?.[0]) return;
          const remote = toCheckState(data.checks[0]);
          setChecks(remote.checks);
          setOdometer(remote.odometer);
          setOdometerPhoto(remote.odometerPhoto);
          setPhotoPreviewError(false);
          setObservations(remote.observations);
          setSavedAt(remote.savedAt);
        })
        .catch(() => undefined);
    }
  };

  const handleOdometerPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOdometerPhoto(reader.result);
      setPhotoPreviewError(false);
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
      setError("No se pudo procesar la foto del tablero. Intenta nuevamente.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setOdometerPhoto(canvas.toDataURL("image/jpeg", 0.9));
    setPhotoPreviewError(false);
    setError("");
    closeCamera();
  };

  const metrics = useMemo(() => {
    const values = Object.values(checks);
    const ok = values.filter((item) => item.status === "ok").length;
    const attention = values.filter((item) => item.status === "attention").length;
    const pending = values.length - ok - attention;
    return { total: values.length, ok, attention, pending, ready: values.length > 0 && pending === 0 && attention === 0 };
  }, [checks]);

  const updateCheck = (id, nextValues) => {
    setChecks((current) => ({
      ...current,
      [id]: { ...current[id], ...nextValues },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!odometerPhoto) {
      setError("Debes tomar o adjuntar una foto del tablero para respaldar el kilometraje.");
      return;
    }
    if (!selectedVehicleId) {
      setError("Selecciona el camión que estás revisando.");
      return;
    }
    const nextSavedAt = new Date().toISOString();
    const draft = { checks, odometer, odometerPhoto, observations, savedAt: nextSavedAt };
    localStorage.setItem(storageKey, JSON.stringify(draft));
    setSaving(true);
    setError("");
    try {
      const { data } = await saveVehicleCheck({ vehicleId: selectedVehicleId, checkDate: today, odometer, odometerPhoto, items: checks, observations });
      const remote = toCheckState(data.check);
      setChecks(remote.checks);
      setOdometer(remote.odometer);
      setOdometerPhoto(remote.odometerPhoto);
      setPhotoPreviewError(false);
      setObservations(remote.observations);
      setSavedAt(remote.savedAt);
      localStorage.setItem(storageKey, JSON.stringify({ ...draft, odometerPhoto: remote.odometerPhoto, savedAt: remote.savedAt }));
    } catch (requestError) {
      setSavedAt(nextSavedAt);
      setError(requestError.response?.data?.message || "Check guardado localmente. Se sincronizará cuando exista conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="vehicle-check-page">
      <div className="driver-hero vehicle-check-hero">
        <div>
          <p className="eyebrow">Control preoperacional</p>
          <h2>Check vehículo</h2>
          <p>Revisa documentación, seguridad, condición mecánica y carga antes de iniciar la operación.</p>
        </div>
        <span className="driver-role">{metrics.ready ? "Apto" : "Revisar"}</span>
      </div>

      {error && <p className="route-error" role="alert">{error}</p>}

      <div className="vehicle-check-summary">
        <article><small>Ítems</small><strong>{loading ? "-" : metrics.total}</strong></article>
        <article><small>OK</small><strong>{loading ? "-" : metrics.ok}</strong></article>
        <article><small>Atención</small><strong>{loading ? "-" : metrics.attention}</strong></article>
        <article><small>Pendientes</small><strong>{loading ? "-" : metrics.pending}</strong></article>
      </div>

      <form className="vehicle-check-form" onSubmit={handleSubmit}>
        <section className="vehicle-check-route">
          <div className="panel-heading">
            <div><p className="eyebrow">Vehículo a revisar</p><h3>{selectedVehicle?.name || "Selecciona un vehículo"}</h3></div>
            <span>{selectedVehicle?.licensePlate || "-"}</span>
          </div>
          <div className="vehicle-check-fields">
            <label>Camión / patente<select value={selectedVehicleId} onChange={(event) => handleVehicleChange(event.target.value)}>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate} · {vehicle.name}</option>)}</select></label>
            <label>Odómetro<input min="0" step="1" type="number" value={odometer} onChange={(event) => setOdometer(event.target.value)} placeholder="Kilometraje inicial" /></label>
          </div>
          <div className="vehicle-odometer-photo">
            <div>
              <strong>Foto del tablero</strong>
              <small>Respalda el kilometraje registrado antes de iniciar la operación.</small>
            </div>
            <div className="driver-photo-actions">
              <button className="secondary-action" onClick={openCamera} type="button">Tomar foto</button>
              <button className="secondary-action" onClick={() => galleryInputRef.current?.click()} type="button">Subir foto</button>
              {odometerPhoto && <button className="danger-action" onClick={() => { setOdometerPhoto(""); setPhotoPreviewError(false); }} type="button">Quitar</button>}
            </div>
            <input ref={cameraInputRef} accept="image/*" capture="environment" className="driver-photo-input" onChange={handleOdometerPhoto} type="file" />
            <input ref={galleryInputRef} accept="image/*" className="driver-photo-input" onChange={handleOdometerPhoto} type="file" />
            {cameraOpen && <div className="driver-camera" role="dialog" aria-label="Cámara para foto del tablero">
              <video ref={videoRef} autoPlay muted playsInline />
              <div className="driver-camera-actions">
                <button className="secondary-action" onClick={closeCamera} type="button">Cancelar</button>
                <button className="primary-action" onClick={capturePhoto} type="button">Capturar</button>
              </div>
            </div>}
            {odometerPhoto && <div className="driver-photo-confirmation">
              {isRenderableImage(odometerPhoto) && !photoPreviewError ? <img className="driver-photo-preview" src={odometerPhoto} alt="Foto del tablero con odómetro" onError={() => setPhotoPreviewError(true)} /> : <span>No se pudo previsualizar la foto guardada. Puedes quitarla y cargar una nueva.</span>}
              {!photoPreviewError && <span>Foto del tablero cargada</span>}
            </div>}
          </div>
          <div className="vehicle-card">
            <strong>{selectedVehicle?.name || "Vehículo pendiente"}</strong>
            <small>Patente: {selectedVehicle?.licensePlate || "Pendiente"}</small>
            <small>Capacidad: {selectedVehicle?.maxWeightKg || "-"} kg · {selectedVehicle?.maxVolumeM3 || "-"} m3</small>
          </div>
        </section>

        <div className="vehicle-check-sections">
          {checklistSections.map((section) => (
            <section className="vehicle-check-section" key={section.title}>
              <div className="panel-heading"><div><p className="eyebrow">Check</p><h3>{section.title}</h3></div></div>
              {section.items.map(([id, label]) => (
                <div className="vehicle-check-item" key={id}>
                  <div>
                    <strong>{label}</strong>
                    <small>{statusLabels[checks[id]?.status] || statusLabels.pending}</small>
                  </div>
                  <div className="vehicle-check-controls">
                    <div className="vehicle-check-toggle" role="group" aria-label={label}>
                      <button className={checks[id]?.status === "ok" ? "active" : ""} onClick={() => updateCheck(id, { status: "ok" })} type="button">OK</button>
                      <button className={checks[id]?.status === "attention" ? "active attention" : ""} onClick={() => updateCheck(id, { status: "attention" })} type="button">Atención</button>
                    </div>
                    <input value={checks[id]?.observation || ""} onChange={(event) => updateCheck(id, { observation: event.target.value })} placeholder="Observación" />
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <label className="vehicle-check-notes">Observaciones generales<textarea value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Registra anomalías, faltantes o autorización recibida" /></label>

        {savedAt && <p className="route-success" role="status">Check guardado: {new Date(savedAt).toLocaleString("es-CL")}</p>}

        <div className="route-detail-actions">
          <button className="primary-action" disabled={saving} type="submit">{saving ? "Guardando..." : "Guardar check"}</button>
          <button className="secondary-action" onClick={() => { setChecks(initialChecks); setOdometer(""); setOdometerPhoto(""); setPhotoPreviewError(false); setObservations(""); setSavedAt(""); localStorage.removeItem(storageKey); }} type="button">Limpiar</button>
        </div>
      </form>
    </section>
  );
}
