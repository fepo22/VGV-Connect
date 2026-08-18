import prisma from "../prismaClient.js";
import { logAudit, logDeliveryEvent } from "../services/audit.service.js";
import { uploadPhoto } from "../services/google-drive.service.js";
import { canTransitionDelivery } from "../services/status-transitions.service.js";

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
  const driverId = req.user.role === "driver" ? req.user.sub : req.query.driverId;
  const deliveries = await prisma.delivery.findMany({
    where: driverId ? { driverId: Number(driverId) } : undefined,
    include: {
      driver: { select: { name: true } },
      route: { select: { id: true, documentType: true, documentNumber: true, serviceDate: true, deliveryDate: true } },
    },
    orderBy: { id: "asc" },
  });
  return res.json(deliveries.map(normalize));
};

export const updateDeliveryStatus = async (req, res) => {
  const delivery = await prisma.delivery.findUnique({ where: { id: Number(req.params.id) } });
  if (!delivery) return res.status(404).json({ message: "Delivery not found" });
  if (req.user.role === "driver" && delivery.driverId !== Number(req.user.sub)) return res.status(403).json({ message: "Entrega no asignada" });
  const nextStatus = req.body.status === "delivered" ? "completed" : req.body.status;
  if (!["pending", "planned", "in_progress", "completed", "rejected", "not_found"].includes(nextStatus)) return res.status(400).json({ message: "Estado inválido" });
  if (!canTransitionDelivery(delivery.status, nextStatus)) return res.status(400).json({ message: `Transición de entrega no permitida: ${delivery.status} a ${nextStatus}` });
  const updated = await prisma.delivery.update({ where: { id: delivery.id }, data: { status: nextStatus, photoUrl: req.body.photoUrl, observations: req.body.observations, latitude: req.body.location?.lat, longitude: req.body.location?.lng, deliveredAt: nextStatus === "completed" ? new Date(req.body.timestamp || Date.now()) : undefined } });
  await logDeliveryEvent({ deliveryId: delivery.id, action: "delivery_updated", metadata: { status: nextStatus, location: req.body.location, observations: req.body.observations } });
  await logAudit({ action: "delivery_updated", userId: req.user.sub, entity: "delivery", entityId: delivery.id, metadata: { status: nextStatus } });
  return res.json({ message: "Status updated", delivery: normalize(updated) });
};

export const uploadDeliveryPhoto = async (req, res) => {
  const delivery = await prisma.delivery.findUnique({ where: { id: Number(req.params.id) } });
  if (!delivery) return res.status(404).json({ message: "Delivery not found" });
  if (req.user.role === "driver" && delivery.driverId !== Number(req.user.sub)) return res.status(403).json({ message: "Entrega no asignada" });
  const result = await uploadPhoto(req.body.photoData, `delivery-${delivery.id}-${Date.now()}.jpg`);
  await prisma.delivery.update({ where: { id: delivery.id }, data: { photoUrl: result.url } });
  await logDeliveryEvent({ deliveryId: delivery.id, action: "photo_uploaded", metadata: { external: result.external } });
  return res.json(result);
};
