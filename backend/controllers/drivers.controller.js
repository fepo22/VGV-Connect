import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { validateNewPassword } from "../services/password-policy.service.js";

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

const isNameTakenByAnotherDriver = async (name, excludeId) => {
  const existing = await prisma.user.findFirst({
    where: { role: "driver", name: { equals: name, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return Boolean(existing);
};

// Alta y renovación comparten reglas: la clave provisoria la define y confirma el administrador,
// cumple la política de B5 y nunca se devuelve ni se registra.
const readTemporaryPassword = (body, context) => {
  const password = typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";
  const confirmation = typeof body?.temporaryPasswordConfirmation === "string" ? body.temporaryPasswordConfirmation : "";
  if (!password) return { error: "Ingresa la contraseña provisoria" };
  if (password !== confirmation) return { error: "La confirmación no coincide con la contraseña provisoria" };
  const policyError = validateNewPassword(password, context);
  return policyError ? { error: policyError } : { password };
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

export const createDriver = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const username = String(req.body.username || "").trim();
  const defaultVehicleId = await parseDefaultVehicleId(req.body.defaultVehicleId);
  if (!name || !username) return res.status(400).json({ message: "Nombre y usuario son obligatorios" });
  if (defaultVehicleId === undefined) return res.status(400).json({ message: "La patente predeterminada no es válida" });
  const temporary = readTemporaryPassword(req.body, { username, name });
  if (temporary.error) return res.status(400).json({ message: temporary.error });
  if (await isNameTakenByAnotherDriver(name)) return res.status(409).json({ message: "Ya existe un conductor con ese nombre" });

  try {
    const driver = await prisma.user.create({
      data: { name, username, role: "driver", passwordHash: await bcrypt.hash(temporary.password, 10), mustChangePassword: true, passwordChangedAt: new Date(), defaultVehicleId },
      select: driverSelect,
    });
    await logAudit({ action: "driver_created", userId: req.user.sub, entity: "driver", entityId: driver.id });
    res.status(201).json({ ...driver, mustChangePassword: true });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "El usuario ya está en uso" });
    throw error;
  }
};

export const updateDriver = async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findFirst({ where: { id, role: "driver" }, select: { id: true, username: true, name: true } });
  if (!existing) return res.status(404).json({ message: "Conductor no encontrado" });
  // La clave solo cambia por POST /drivers/:id/reset-password (confirmación, política, revocación y auditoría propia).
  if (["password", "temporaryPassword", "temporaryPasswordConfirmation"].some((key) => req.body?.[key] != null && req.body[key] !== "")) {
    return res.status(400).json({ message: "La contraseña no se modifica al editar el conductor. Usa la renovación de clave." });
  }

  const data = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ message: "El nombre es obligatorio" });
    if (await isNameTakenByAnotherDriver(name, id)) return res.status(409).json({ message: "Ya existe un conductor con ese nombre" });
    data.name = name;
  }
  if (req.body.username !== undefined) {
    const username = String(req.body.username).trim();
    if (!username) return res.status(400).json({ message: "El usuario es obligatorio" });
    data.username = username;
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

export const resetDriverPassword = async (req, res) => {
  const id = Number(req.params.id);
  const driver = await prisma.user.findFirst({ where: { id, role: "driver" }, select: { id: true, username: true, name: true } });
  if (!driver) return res.status(404).json({ message: "Conductor no encontrado" });
  const temporary = readTemporaryPassword(req.body, { username: driver.username, name: driver.name });
  if (temporary.error) return res.status(400).json({ message: temporary.error });
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(temporary.password, 10), mustChangePassword: true, passwordChangedAt: new Date() },
    select: { id: true },
  });
  await logAudit({ action: "driver_password_reset", userId: req.user.sub, entity: "driver", entityId: id });
  res.json({ id, username: driver.username, mustChangePassword: true });
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
