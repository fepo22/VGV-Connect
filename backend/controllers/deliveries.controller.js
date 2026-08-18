import { deliveries } from "../data/deliveries.mock.js";
import { logAudit } from "../data/audit.mock.js";
import { syncRouteDelivery } from "./routes.controller.js";
import { uploadPhoto } from "../services/google-drive.service.js";

const allowedStatuses = ["pending", "in_progress", "completed", "rejected", "not_found", "delivered"];

export const getDeliveries = (req, res) => {
  const driverId = req.user.role === "driver" ? req.user.sub : req.query.driverId;
  const result = driverId
    ? deliveries.filter((delivery) => delivery.driverId === Number(driverId))
    : deliveries;
  res.json(result);
};

export const updateDeliveryStatus = (req, res) => {
  const { id } = req.params;
  const { status, photoUrl, location, observations, timestamp, driverId } = req.body;

  const delivery = deliveries.find((d) => d.id === Number(id));

  if (!delivery) {
    return res.status(404).json({ message: "Delivery not found" });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Estado de entrega inválido" });
  }

  const currentStatus = delivery.estado === "in_route" ? "in_progress" : delivery.estado;
  const nextStatus = status === "delivered" ? "completed" : status;
  const canTransition = currentStatus === nextStatus ||
    (currentStatus === "pending" && ["in_progress", "rejected", "not_found"].includes(nextStatus)) ||
    (currentStatus === "in_progress" && ["completed", "rejected", "not_found"].includes(nextStatus));

  if (!canTransition) {
    return res.status(409).json({ message: `No se puede pasar de ${currentStatus} a ${nextStatus}` });
  }

  if (req.user.role === "driver" && delivery.driverId !== Number(req.user.sub)) {
    return res.status(403).json({ message: "La entrega no está asignada a este chofer" });
  }

  delivery.estado = nextStatus;
  if (photoUrl !== undefined) delivery.photoUrl = photoUrl;
  if (location !== undefined) delivery.location = location;
  if (observations !== undefined) delivery.observations = observations;
  if (timestamp !== undefined) delivery.completedAt = timestamp;
  syncRouteDelivery(delivery);
  logAudit({
    action: "delivery_updated",
    userId: req.user.sub,
    role: req.user.role,
    entity: "delivery",
    entityId: delivery.id,
    metadata: { status: nextStatus, location, observations, photoUrl: Boolean(photoUrl), timestamp },
  });

  res.json({ message: "Status updated", delivery });
};

export const uploadDeliveryPhoto = async (req, res) => {
  const delivery = deliveries.find((item) => item.id === Number(req.params.id));
  if (!delivery) return res.status(404).json({ message: "Delivery not found" });
  if (req.user.role === "driver" && delivery.driverId !== Number(req.user.sub)) {
    return res.status(403).json({ message: "La entrega no está asignada a este chofer" });
  }
  if (!req.body.photoData) return res.status(400).json({ message: "Foto requerida" });

  try {
    const result = await uploadPhoto(req.body.photoData, `delivery-${delivery.id}-${Date.now()}.jpg`);
    delivery.photoUrl = result.url;
    logAudit({ action: "delivery_photo_uploaded", userId: req.user.sub, role: req.user.role, entity: "delivery", entityId: delivery.id, metadata: { external: result.external } });
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: "No se pudo subir la foto", detail: error.message });
  }
};
