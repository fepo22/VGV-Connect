import prisma from "../prismaClient.js";
import { uploadPhoto } from "../services/google-drive.service.js";
import { getOperationalDate, parseDateOnly } from "../services/operational-date.service.js";

const positiveId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const photoDataUrlPattern = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;
const isStoredPhotoFromUploadService = (value) =>
  photoDataUrlPattern.test(value)
  || /^https:\/\/drive\.google\.com\/file\/d\/[^/?#]+\/view(?:[?#].*)?$/i.test(value);

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

const resolveDriverId = (req) => req.user.role === "driver"
  ? positiveId(req.user.sub)
  : positiveId(req.query.driverId);

const hasAuthorizedVehicle = async (driver, vehicleId) => {
  if (driver.defaultVehicleId === vehicleId) return true;
  const today = parseDateOnly(getOperationalDate());
  const route = await prisma.route.findFirst({
    where: {
      driverId: driver.id,
      vehicleId,
      status: { in: ["draft", "planned", "in_progress"] },
      serviceDate: { gte: today },
    },
    select: { id: true },
  });
  return Boolean(route);
};

export const getVehicleChecks = async (req, res) => {
  const driverId = resolveDriverId(req);
  if (!driverId) return res.status(400).json({ message: "Conductor requerido o no válido" });
  if (req.user.role !== "driver") {
    const driver = await prisma.user.findFirst({ where: { id: driverId, role: "driver" }, select: { id: true } });
    if (!driver) return res.status(400).json({ message: "Conductor no válido" });
  }

  const vehicleId = req.query.vehicleId === undefined ? undefined : positiveId(req.query.vehicleId);
  if (req.query.vehicleId !== undefined && !vehicleId) return res.status(400).json({ message: "Vehículo no válido" });
  const checkDate = req.query.date === undefined ? undefined : parseDateOnly(req.query.date);
  if (req.query.date !== undefined && !checkDate) return res.status(400).json({ message: "Fecha de check no válida" });

  const checks = await prisma.vehicleCheck.findMany({
    where: {
      driverId,
      ...(vehicleId ? { vehicleId } : {}),
      ...(checkDate ? { checkDate } : {}),
    },
    include: { vehicle: { select: { id: true, name: true, licensePlate: true } } },
    orderBy: { checkDate: "desc" },
    take: 30,
  });

  return res.json({ checks: checks.map(normalizeCheck) });
};

export const saveVehicleCheck = async (req, res) => {
  const driverId = req.user.role === "driver" ? positiveId(req.user.sub) : positiveId(req.body.driverId);
  const vehicleId = positiveId(req.body.vehicleId);
  const checkDate = parseDateOnly(req.body.checkDate || getOperationalDate());
  const odometer = req.body.odometer === "" || req.body.odometer == null ? null : Number(req.body.odometer);
  const items = req.body.items;

  if (!driverId || !vehicleId || !checkDate) return res.status(400).json({ message: "Conductor, vehículo y fecha son obligatorios" });
  if (odometer !== null && (!Number.isInteger(odometer) || odometer < 0)) return res.status(400).json({ message: "Odómetro no válido" });
  if (!items || typeof items !== "object" || Array.isArray(items)) return res.status(400).json({ message: "Checklist no válido" });
  if (Object.hasOwn(req.body, "odometerPhotoUrl")) return res.status(400).json({ message: "Envía la foto del tablero mediante el mecanismo de carga de imágenes" });

  const [driver, vehicle] = await Promise.all([
    prisma.user.findFirst({ where: { id: driverId, role: "driver" }, select: { id: true, defaultVehicleId: true } }),
    prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } }),
  ]);
  if (!driver || !vehicle) return res.status(400).json({ message: "Conductor o vehículo no válido" });
  if (req.user.role === "driver" && !(await hasAuthorizedVehicle(driver, vehicleId))) {
    return res.status(403).json({ message: "No tienes autorización para inspeccionar este vehículo" });
  }

  const existing = await prisma.vehicleCheck.findUnique({
    where: { driverId_vehicleId_checkDate: { driverId, vehicleId, checkDate } },
    select: { id: true, odometerPhotoUrl: true },
  });
  const photoData = req.body.odometerPhoto;
  let photo;
  if (typeof photoData === "string" && photoDataUrlPattern.test(photoData)) {
    photo = await uploadPhoto(photoData, `vehicle-check-${driverId}-${vehicleId}-${Date.now()}.jpg`);
  } else if (existing && photoData === existing.odometerPhotoUrl && isStoredPhotoFromUploadService(photoData)) {
    photo = { url: existing.odometerPhotoUrl, external: true };
  } else {
    return res.status(400).json({ message: "Foto del tablero requerida mediante carga de imagen" });
  }

  const statusValues = Object.values(items).map((item) => item?.status);
  const status = statusValues.some((value) => value === "attention") ? "attention" : statusValues.every((value) => value === "ok") ? "ok" : "pending";
  const check = await prisma.$transaction(async (tx) => {
    const savedCheck = await tx.vehicleCheck.upsert({
      where: { driverId_vehicleId_checkDate: { driverId, vehicleId, checkDate } },
      update: { odometer, odometerPhotoUrl: photo.url, items, observations: req.body.observations || null, status },
      create: { driverId, vehicleId, checkDate, odometer, odometerPhotoUrl: photo.url, items, observations: req.body.observations || null, status },
      include: { vehicle: { select: { id: true, name: true, licensePlate: true } } },
    });
    await tx.auditLog.create({
      data: {
        action: "vehicle_check_saved",
        userId: Number(req.user.sub),
        entity: "vehicle_check",
        entityId: savedCheck.id,
        metadata: { driverId, vehicleId, status, externalPhoto: photo.external },
      },
    });
    return savedCheck;
  });
  return res.status(201).json({ check: normalizeCheck(check) });
};
