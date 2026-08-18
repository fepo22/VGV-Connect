const aliases = {
  delivered: "completed",
  in_route: "in_progress",
  "en ruta": "in_progress",
  pendiente: "pending",
  planificado: "planned",
  "en progreso": "in_progress",
  completado: "completed",
  rechazado: "rejected",
  "no encontrado": "not_found",
};

export const normalizeDeliveryStatus = (value) => {
  const status = String(value || "pending").trim().toLowerCase();
  return aliases[status] || status;
};

export const deliveryStatusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "planned", label: "Planificado" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completado" },
  { value: "rejected", label: "Rechazado" },
  { value: "not_found", label: "No encontrado" },
];

const allowedTransitions = {
  pending: ["pending", "planned", "in_progress"],
  planned: ["planned", "in_progress"],
  in_progress: ["in_progress", "completed", "rejected", "not_found"],
  completed: ["completed"],
  rejected: ["rejected"],
  not_found: ["not_found"],
};

export const getAllowedDeliveryStatuses = (status) =>
  allowedTransitions[normalizeDeliveryStatus(status)] || ["pending"];