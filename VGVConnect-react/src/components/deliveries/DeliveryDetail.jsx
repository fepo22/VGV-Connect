import DeliveryStatusBadge from "./DeliveryStatusBadge";
import DeliveryPhotoUpload from "./DeliveryPhotoUpload";

export default function DeliveryDetail({ route, onConfirm, onClose }) {
  const handlePhoto = (file) => {
    console.log("Foto seleccionada", file);
  };

  if (!route) {
    return (
      <div
        style={{
          padding: "20px",
          borderRadius: "16px",
          background: "#fff",
          boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
        }}
      >
        <p style={{ margin: 0, color: "#555" }}>Selecciona una parada para ver los detalles de la ruta.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "16px",
        background: "#fff",
        boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
      }}
    >
      <h2>Detalle de parada</h2>
      <p style={{ margin: "8px 0" }}>
        <strong>Guía:</strong> {route.reference}
      </p>
      <p style={{ margin: "8px 0" }}>
        <strong>Cliente:</strong> {route.client}
      </p>
      <p style={{ margin: "8px 0" }}>
        <strong>Chofer asignado:</strong> {route.driver}
      </p>
      <p style={{ margin: "8px 0" }}>
        <strong>Patente:</strong> {route.vehicle}
      </p>
      <p style={{ margin: "8px 0" }}>
        <strong>Dirección:</strong> {route.address}
      </p>
      <p style={{ margin: "8px 0" }}>
        <strong>Georeferencia:</strong> {route.geoPoint}
      </p>
      <p style={{ margin: "8px 0" }}>
        <strong>ETA:</strong> {route.eta}
      </p>
      <DeliveryStatusBadge status={route.status} />

      <h4 style={{ marginTop: "20px" }}>Foto de entrega</h4>
      <DeliveryPhotoUpload onPhotoSelected={handlePhoto} />

      <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
        <button
          onClick={onConfirm}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#28a745",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Confirmar entrega
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
