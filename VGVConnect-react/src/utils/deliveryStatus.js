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