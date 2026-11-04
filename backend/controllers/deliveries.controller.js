import prisma from "../prismaClient.js";
import { logDeliveryEvent } from "../services/audit.service.js";
import { uploadPhoto } from "../services/google-drive.service.js";
import { canTransitionDelivery } from "../services/status-transitions.service.js";

const terminalDeliveryStatuses = ["completed", "rejected", "not_found"];

const normalize = (delivery) => ({
  id: delivery.id,
  driverId: delivery.driverId,
  routeId: delivery.routeId,
  guideNumber: delivery.guideNumber,
  client: delivery.clientName,
  cliente: delivery.clientName,
  address: delivery.address,
  direccion: delivery.address,
  commune: delivery.commune,
  region: delivery.region,
  status: delivery.status,
  estado: delivery.status,
  photoUrl: delivery.photoUrl,
  location: delivery.latitude !== null && delivery.longitude !== null ? { lat: Number(delivery.latitude), lng: Number(delivery.longitude) } : null,
  observations: delivery.observations,
  weightKg: delivery.weightKg,
  volumeM3: delivery.volumeM3,
  createdAt: delivery.createdAt,
  updatedAt: delivery.updatedAt,
  deliveredAt: delivery.deliveredAt,
  driverName: delivery.driver?.name || null,
  route: delivery.route ? {
    id: delivery.route.id,
    documentType: delivery.route.documentType,
    documentNumber: delivery.route.documentNumber,
    serviceDate: delivery.route.serviceDate,
    deliveryDate: delivery.route.deliveryDate,
  } : null,
});

export const getDeliveries = async (req, res) => {
  const driverId = req.user.role === "driver" ? Number(req.user.sub) : req.query.driverId;
  if (req.user.role !== "driver" && driverId !== undefined) {
    const parsedDriverId = Array.isArray(driverId) ? null : Number(driverId);
    if (!Number.isSafeInteger(parsedDriverId) || parsedDriverId <= 0) {
      return res.status(400).json({ message: "El parámetro driverId debe ser un identificador numérico válido y único" });
    }
  }
  const filterDriverId = req.user.role === "driver" ? driverId : driverId === undefined ? undefined : Number(driverId);
  const deliveries = await prisma.delivery.findMany({
    where: filterDriverId === undefined ? undefined : { driverId: filterDriverId },
    include: {
      driver: { select: { name: true } },
      route: { select: { id: true, documentType: true, documentNumber: true, serviceDate: true, deliveryDate: true } },
    },
    orderBy: { id: "asc" },
  });
  return res.json(deliveries.map(normalize));
};

export const updateDeliveryStatus = async (req, res) => {
  const nextStatus = req.body.status === "delivered" ? "completed" : req.body.status;
  if (!["pending", "planned", "in_progress", "completed", "rejected", "not_found"].includes(nextStatus)) return res.status(400).json({ message: "Estado inválido" });
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id: Number(req.params.id) } });
      if (!delivery) return { error: { status: 404, message: "Delivery not found" } };
      if (req.user.role === "driver" && delivery.driverId !== Number(req.user.sub)) {
        return { error: { status: 403, message: "Entrega no asignada" } };
      }
      if (req.user.role === "driver" && terminalDeliveryStatuses.includes(delivery.status)) {
        return { error: { status: 409, message: "La entrega tiene un resultado final y no puede modificarse" } };
      }
      if (!canTransitionDelivery(delivery.status, nextStatus)) {
        return { error: { status: 400, message: `Transición de entrega no permitida: ${delivery.status} a ${nextStatus}` } };
      }
      const saved = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: nextStatus,
          photoUrl: req.body.photoUrl,
          observations: req.body.observations,
          latitude: req.body.location?.lat,
          longitude: req.body.location?.lng,
          deliveredAt: nextStatus === "completed" ? new Date(req.body.timestamp || Date.now()) : undefined,
        },
      });
      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          action: "delivery_updated",
          metadata: { status: nextStatus, location: req.body.location, observations: req.body.observations },
        },
      });
      await tx.auditLog.create({
        data: { action: "delivery_updated", userId: Number(req.user.sub), entity: "delivery", entityId: delivery.id, metadata: { status: nextStatus } },
      });
      return { delivery: saved };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error?.code === "P2034" || error?.code === "P2025") {
      return res.status(409).json({ message: "La entrega cambió durante esta operación. Recarga e inténtalo nuevamente." });
    }
    throw error;
  }
  if (updated.error) return res.status(updated.error.status).json({ message: updated.error.message });
  return res.json({ message: "Status updated", delivery: normalize(updated.delivery) });
};

export const uploadDeliveryPhoto = async (req, res) => {
  const delivery = await prisma.delivery.findUnique({ where: { id: Number(req.params.id) } });
  if (!delivery) return res.status(404).json({ message: "Delivery not found" });
  if (req.user.role === "driver" && delivery.driverId !== Number(req.user.sub)) return res.status(403).json({ message: "Entrega no asignada" });
  if (terminalDeliveryStatuses.includes(delivery.status)) {
    return res.status(409).json({ message: "La entrega tiene un resultado final y no admite nuevas modificaciones" });
  }
  const result = await uploadPhoto(req.body.photoData, `delivery-${delivery.id}-${Date.now()}.jpg`);
  const updated = await prisma.delivery.updateMany({
    where: { id: delivery.id, status: { notIn: terminalDeliveryStatuses } },
    data: { photoUrl: result.url },
  });
  if (!updated.count) return res.status(409).json({ message: "La entrega finalizó durante la carga y no admite nuevas modificaciones" });
  await logDeliveryEvent({ deliveryId: delivery.id, action: "photo_uploaded", metadata: { external: result.external } });
  return res.json(result);
};
