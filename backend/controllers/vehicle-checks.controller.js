import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { uploadPhoto } from "../services/google-drive.service.js";

const toDateOnly = (value) => {
  const source = value || new Date().toISOString().slice(0, 10);
  const date = new Date(`${source}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeCheck = (check) => ({
  id: check.id,
  driverId: check.driverId,
  vehicleId: check.vehicleId,
  checkDate: check.checkDate.toISOString().slice(0, 10),
  odometer: check.odometer,
  odometerPhotoUrl: check.odometerPhotoUrl,
  items: check.items,
  observations: check.observations,
  status: check.status,
  vehicle: check.vehicle ? { id: check.vehicle.id, name: check.vehicle.name, licensePlate: check.vehicle.licensePlate } : null,
  createdAt: check.createdAt,
  updatedAt: check.updatedAt,
});

const resolveDriverId = (req) => req.user.role === "driver" ? Number(req.user.sub) : Number(req.query.driverId || req.body.driverId);

export const getVehicleChecks = async (req, res) => {
  const driverId = resolveDriverId(req);
  if (!driverId) return res.status(400).json({ message: "Conductor requerido" });

  const where = {
    driverId,
    ...(req.query.vehicleId ? { vehicleId: Number(req.query.vehicleId) } : {}),
    ...(req.query.date ? { checkDate: toDateOnly(req.query.date) } : {}),
  };

  if (where.checkDate === null) return res.status(400).json({ message: "Fecha de check no válida" });

  const checks = await prisma.vehicleCheck.findMany({
    where,
    include: { vehicle: { select: { id: true, name: true, licensePlate: true } } },
    orderBy: { checkDate: "desc" },
    take: 30,
  });

  return res.json({ checks: checks.map(normalizeCheck) });
};

export const saveVehicleCheck = async (req, res) => {
  const driverId = req.user.role === "driver" ? Number(req.user.sub) : Number(req.body.driverId);
  const vehicleId = Number(req.body.vehicleId);
  const checkDate = toDateOnly(req.body.checkDate);
  const odometer = req.body.odometer === "" || req.body.odometer == null ? null : Number(req.body.odometer);
  const items = req.body.items;

  if (!driverId || !vehicleId || !checkDate) return res.status(400).json({ message: "Conductor, vehículo y fecha son obligatorios" });
  if (odometer !== null && (!Number.isInteger(odometer) || odometer < 0)) return res.status(400).json({ message: "Odómetro no válido" });
  if (!items || typeof items !== "object" || Array.isArray(items)) return res.status(400).json({ message: "Checklist no válido" });
  if (!req.body.odometerPhoto && !req.body.odometerPhotoUrl) return res.status(400).json({ message: "Foto del tablero requerida" });

  const [driver, vehicle] = await Promise.all([
    prisma.user.findFirst({ where: { id: driverId, role: "driver" }, select: { id: true } }),
    prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } }),
  ]);
  if (!driver || !vehicle) return res.status(400).json({ message: "Conductor o vehículo no válido" });

  const statusValues = Object.values(items).map((item) => item?.status);
  const status = statusValues.some((value) => value === "attention") ? "attention" : statusValues.every((value) => value === "ok") ? "ok" : "pending";
  const photo = req.body.odometerPhoto ? await uploadPhoto(req.body.odometerPhoto, `vehicle-check-${driverId}-${vehicleId}-${Date.now()}.jpg`) : { url: req.body.odometerPhotoUrl, external: true };

  const check = await prisma.vehicleCheck.upsert({
    where: { driverId_vehicleId_checkDate: { driverId, vehicleId, checkDate } },
    update: { odometer, odometerPhotoUrl: photo.url, items, observations: req.body.observations || null, status },
    create: { driverId, vehicleId, checkDate, odometer, odometerPhotoUrl: photo.url, items, observations: req.body.observations || null, status },
    include: { vehicle: { select: { id: true, name: true, licensePlate: true } } },
  });

  await logAudit({ action: "vehicle_check_saved", userId: req.user.sub, entity: "vehicle_check", entityId: check.id, metadata: { vehicleId, status, externalPhoto: photo.external } });
  return res.status(201).json({ check: normalizeCheck(check) });
};