import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";

const driverSelect = {
  id: true,
  username: true,
  name: true,
  defaultVehicleId: true,
  defaultVehicle: { select: { id: true, name: true, licensePlate: true } },
};

const parseDefaultVehicleId = async (value) => {
  if (value == null || value === "") return null;
  const vehicleId = Number(value);
  if (!Number.isInteger(vehicleId) || vehicleId < 1) return undefined;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  return vehicle ? vehicle.id : undefined;
};

export const getDrivers = async (_req, res) => {
  const [drivers, vehicles] = await Promise.all([
    prisma.user.findMany({
      where: { role: "driver" },
      select: driverSelect,
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({ select: { id: true, name: true, licensePlate: true }, orderBy: { licensePlate: "asc" } }),
  ]);
  res.json({ drivers, vehicles });
};

const generateTemporaryPassword = () => Math.floor(1000 + Math.random() * 9000).toString();

export const createDriver = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const username = String(req.body.username || "").trim();
  const defaultVehicleId = await parseDefaultVehicleId(req.body.defaultVehicleId);
  if (!name || !username) return res.status(400).json({ message: "Nombre y usuario son obligatorios" });
  if (defaultVehicleId === undefined) return res.status(400).json({ message: "La patente predeterminada no es válida" });

  const temporaryPassword = generateTemporaryPassword();

  try {
    const driver = await prisma.user.create({
      data: { name, username, role: "driver", passwordHash: await bcrypt.hash(temporaryPassword, 10), defaultVehicleId },
      select: driverSelect,
    });
    await logAudit({ action: "driver_created", userId: req.user.sub, entity: "driver", entityId: driver.id });
    res.status(201).json({ ...driver, temporaryPassword });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "El usuario ya está en uso" });
    throw error;
  }
};

export const updateDriver = async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findFirst({ where: { id, role: "driver" }, select: { id: true } });
  if (!existing) return res.status(404).json({ message: "Conductor no encontrado" });

  const data = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ message: "El nombre es obligatorio" });
    data.name = name;
  }
  if (req.body.username !== undefined) {
    const username = String(req.body.username).trim();
    if (!username) return res.status(400).json({ message: "El usuario es obligatorio" });
    data.username = username;
  }
  if (req.body.password !== undefined && req.body.password !== "") {
    if (String(req.body.password).length < 4) return res.status(400).json({ message: "La contraseña debe tener al menos 4 caracteres" });
    data.passwordHash = await bcrypt.hash(String(req.body.password), 10);
  }
  if (req.body.defaultVehicleId !== undefined) {
    const defaultVehicleId = await parseDefaultVehicleId(req.body.defaultVehicleId);
    if (defaultVehicleId === undefined) return res.status(400).json({ message: "La patente predeterminada no es válida" });
    data.defaultVehicleId = defaultVehicleId;
  }

  try {
    const driver = await prisma.user.update({ where: { id }, data, select: driverSelect });
    await logAudit({ action: "driver_updated", userId: req.user.sub, entity: "driver", entityId: id });
    res.json(driver);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "El usuario ya está en uso" });
    throw error;
  }
};

export const deleteDriver = async (req, res) => {
  const id = Number(req.params.id);
  const driver = await prisma.user.findFirst({ where: { id, role: "driver" }, select: { id: true, _count: { select: { routes: true } } } });
  if (!driver) return res.status(404).json({ message: "Conductor no encontrado" });
  if (driver._count.routes > 0) return res.status(409).json({ message: "No se puede eliminar un conductor con rutas asignadas" });
  await prisma.user.delete({ where: { id } });
  await logAudit({ action: "driver_deleted", userId: req.user.sub, entity: "driver", entityId: id });
  res.status(204).send();
};

export const getDriversOverview = async (_req, res) => {
  const drivers = await prisma.user.findMany({
    where: { role: "driver" },
    select: {
      id: true,
      username: true,
      name: true,
      defaultVehicleId: true,
      defaultVehicle: { select: { id: true, name: true, licensePlate: true } },
      routes: { select: { id: true, status: true, documentType: true, documentNumber: true, serviceDate: true, destination: true, distanceKm: true, vehicle: { select: { licensePlate: true, name: true } } } },
      deliveries: { where: { routeId: { not: null } }, select: { id: true, status: true, weightKg: true, volumeM3: true, routeId: true } },
    },
    orderBy: { name: "asc" },
  });

  const overview = drivers.map((driver) => {
    const completed = driver.deliveries.filter((item) => item.status === "completed").length;
    const incidents = driver.deliveries.filter((item) => ["rejected", "not_found"].includes(item.status)).length;
    const weightKg = driver.deliveries.reduce((sum, item) => sum + Number(item.weightKg || 0), 0);
    const volumeM3 = driver.deliveries.reduce((sum, item) => sum + Number(item.volumeM3 || 0), 0);
    return {
      id: driver.id,
      username: driver.username,
      name: driver.name,
      defaultVehicleId: driver.defaultVehicleId,
      defaultVehicle: driver.defaultVehicle,
      routes: driver.routes,
      routeCount: driver.routes.length,
      activeRoutes: driver.routes.filter((route) => ["planned", "in_progress"].includes(route.status)).length,
      deliveries: driver.deliveries.length,
      completed,
      pending: driver.deliveries.length - completed,
      incidents,
      completionRate: driver.deliveries.length ? Math.round((completed / driver.deliveries.length) * 100) : 0,
      weightKg: Number(weightKg.toFixed(2)),
      volumeM3: Number(volumeM3.toFixed(3)),
    };
  });

  res.json({
    drivers: overview,
    summary: {
      drivers: overview.length,
      activeRoutes: overview.reduce((sum, item) => sum + item.activeRoutes, 0),
      deliveries: overview.reduce((sum, item) => sum + item.deliveries, 0),
      completed: overview.reduce((sum, item) => sum + item.completed, 0),
      incidents: overview.reduce((sum, item) => sum + item.incidents, 0),
    },
  });
};
