import { normalizeDeliveryStatus } from "../../utils/deliveryStatus";

export default function DeliveryStatusBadge({ status }) {
  const normalized = normalizeDeliveryStatus(status);
  const colors = {
    pending: "#f0ad4e",
    planned: "#5b7cfa",
    in_progress: "#0275d8",
    completed: "#5cb85c",
    rejected: "#d9534f",
    not_found: "#8d6e63",
  };
  const labels = {
    pending: "Pendiente",
    planned: "Planificado",
    in_progress: "En progreso",
    completed: "Completado",
    rejected: "Rechazado",
    not_found: "No encontrado",
  };

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "20px",
        background: colors[normalized] || "#999",
        color: "#fff",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {labels[normalized] || normalized}
    </span>
  );
}
