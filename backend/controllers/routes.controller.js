import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { geocodeAddress } from "../services/geocoding.service.js";
import { canTransitionDelivery, canTransitionRoute } from "../services/status-transitions.service.js";

const drivers = async () => prisma.user.findMany({ where: { role: "driver" }, select: { id: true, name: true, defaultVehicleId: true }, orderBy: { name: "asc" } });
const routeInclude = { driver: { select: { id: true, name: true } }, vehicle: true, deliveries: true };
const toRoute = (route) => ({ ...route, date: route.serviceDate.toISOString().slice(0, 10), deliveryDate: route.deliveryDate?.toISOString().slice(0, 10) || "", startTime: route.startAt.toISOString().slice(11, 16), weightKg: route.weightKg === null ? null : Number(route.weightKg), volumeM3: route.volumeM3 === null ? null : Number(route.volumeM3), driverName: route.driver?.name || "Sin asignar", vehicleName: route.vehicle?.name || "Sin camión", vehicleLicensePlate: route.vehicle?.licensePlate || "Patente pendiente", stopCount: route.deliveries.length, stops: route.deliveries.map((delivery, index) => ({ id: delivery.id, guideNumber: delivery.guideNumber, client: delivery.clientName, address: delivery.address, status: delivery.status, sequence: index + 1, location: delivery.latitude !== null && delivery.longitude !== null ? { lat: Number(delivery.latitude), lng: Number(delivery.longitude) } : null })), coordinates: route.deliveries.filter((delivery) => delivery.latitude !== null && delivery.longitude !== null).map((delivery) => ({ lat: Number(delivery.latitude), lng: Number(delivery.longitude) })) });
const startAt = (date, time) => new Date(`${date}T${time}:00`);
const nextRouteName = async (date) => {
  const dayStart = new Date(`${date}T00:00:00.000`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const dailyRoutes = await prisma.route.count({ where: { serviceDate: { gte: dayStart, lt: dayEnd } } });
  const formattedDate = date.split("-").reverse().join("-");
  return `Ruta ${formattedDate} / ${String(dailyRoutes + 1).padStart(3, "0")}`;
};
const optionalDecimal = (value) => {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export const normalizeRouteStopInput = (stop = {}, fallbackStatus = "pending") => {
  const id = stop.id == null || stop.id === "" ? null : Number(stop.id);
  const client = String(stop.client || stop.clientName || "Punto de descarga").trim() || "Punto de descarga";
  const address = String(stop.address || stop.direccion || "").trim();
  const guideNumber = stop.guideNumber == null || stop.guideNumber === "" ? null : String(stop.guideNumber).trim();
  return { id, client, address, guideNumber, status: stop.status || fallbackStatus };
};

export const planRouteStopChanges = (currentStops = [], incomingStops = []) => {
  const currentMap = new Map((currentStops || []).filter((stop) => stop && stop.id != null).map((stop) => [Number(stop.id), stop]));
  const normalizedIncoming = (incomingStops || []).map((stop) => normalizeRouteStopInput(stop, "pending"));
  const incomingIds = new Set(normalizedIncoming.filter((stop) => stop.id != null && !Number.isNaN(stop.id)).map((stop) => stop.id));

  return {
    incoming: normalizedIncoming,
    toCreate: normalizedIncoming.filter((stop) => stop.id == null || Number.isNaN(stop.id)),
    toUpdate: normalizedIncoming.filter((stop) => stop.id != null && !Number.isNaN(stop.id)),
    toRemove: (currentStops || []).filter((stop) => stop && stop.id != null && !incomingIds.has(Number(stop.id))),
    currentMap,
  };
};

export const getRoutes = async (req, res) => {
  const where = req.user.role === "driver" ? { driverId: Number(req.user.sub) } : req.query.driverId ? { driverId: Number(req.query.driverId) } : undefined;
  const [routes, driverList, vehicleList, availableStops] = await Promise.all([
    prisma.route.findMany({ where, include: routeInclude, orderBy: { serviceDate: "desc" } }),
    drivers(), prisma.vehicle.findMany({ orderBy: { licensePlate: "asc" } }),
    prisma.delivery.findMany({ where: { routeId: null }, orderBy: { id: "asc" } }),
  ]);
  res.json({ routes: routes.map(toRoute), drivers: driverList, vehicles: vehicleList, availableStops });
};

export const getRoute = async (req, res) => {
  const route = await prisma.route.findUnique({ where: { id: Number(req.params.id) }, include: routeInclude });
  if (!route) return res.status(404).json({ message: "Ruta no encontrada" });
  if (req.user.role === "driver" && route.driverId !== Number(req.user.sub)) return res.status(403).json({ message: "Ruta no asignada" });
  res.json(toRoute(route));
};

export const createRoute = async (req, res) => {
  const { date, deliveryDate, startTime, origin, destination, driverId, vehicleId, weightKg: rawWeightKg, volumeM3: rawVolumeM3, stops } = req.body;
  if (!date || !startTime || !destination || driverId == null || vehicleId == null) return res.status(400).json({ message: "Chofer, patente, fecha, hora y destino son obligatorios" });
  const weightKg = optionalDecimal(rawWeightKg);
  const volumeM3 = optionalDecimal(rawVolumeM3);
  if ((rawWeightKg !== undefined && weightKg === undefined) || (rawVolumeM3 !== undefined && volumeM3 === undefined)) return res.status(400).json({ message: "Peso y volumen deben ser valores numéricos positivos" });

  const [driver, vehicle] = await Promise.all([
    prisma.user.findFirst({ where: { id: Number(driverId), role: "driver" } }),
    prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } }),
  ]);
  if (!driver || !vehicle) return res.status(400).json({ message: "Chofer o patente no válidos" });

  const [originLocation, destinationLocation] = await Promise.all([geocodeAddress(origin), geocodeAddress(destination)]);
  const routeName = await nextRouteName(date);
  const route = await prisma.route.create({
    data: {
      serviceDate: new Date(`${date}T00:00:00`),
      deliveryDate: deliveryDate ? new Date(`${deliveryDate}T00:00:00`) : null,
      startAt: startAt(date, startTime),
      origin: origin || "",
      destination,
      weightKg: weightKg ?? null,
      volumeM3: volumeM3 ?? null,
      documentType: "route",
      documentNumber: routeName,
      driverId: driver.id,
      vehicleId: vehicle.id,
    },
    include: routeInclude,
  });

  if (Array.isArray(stops) && stops.length) {
    const stopRows = stops.map((stop) => {
      const nextStop = normalizeRouteStopInput(stop, "pending");
      return {
        routeId: route.id,
        driverId: driver.id,
        clientName: nextStop.client,
        address: nextStop.address,
        guideNumber: nextStop.guideNumber,
        status: nextStop.status,
      };
    });

    await prisma.delivery.createMany({ data: stopRows });
  }

  const routeWithStops = await prisma.route.findUnique({ where: { id: route.id }, include: routeInclude });
  await logAudit({ action: "route_created", userId: req.user.sub, entity: "route", entityId: route.id, metadata: { originLocation, destinationLocation } });
  res.status(201).json({ ...toRoute(routeWithStops), originLocation, destinationLocation });
};

export const updateRoute = async (req, res) => {
  const route = await prisma.route.findUnique({ where: { id: Number(req.params.id) } });
  if (!route) return res.status(404).json({ message: "Ruta no encontrada" });

  const { date, deliveryDate, startTime, origin, destination, documentType, documentNumber, status, driverId, vehicleId, weightKg: rawWeightKg, volumeM3: rawVolumeM3, stops } = req.body;
  if (status !== undefined && !canTransitionRoute(route.status, status)) return res.status(400).json({ message: `Transición de ruta no permitida: ${route.status} a ${status}` });
  if (status === "completed") {
    const unresolvedStops = await prisma.delivery.count({ where: { routeId: route.id, status: { notIn: ["completed", "rejected", "not_found"] } } });
    if (unresolvedStops) return res.status(400).json({ message: "No se puede completar la ruta mientras existan puntos sin resultado final" });
  }
  const weightKg = optionalDecimal(rawWeightKg);
  const volumeM3 = optionalDecimal(rawVolumeM3);
  if ((rawWeightKg !== undefined && weightKg === undefined) || (rawVolumeM3 !== undefined && volumeM3 === undefined)) return res.status(400).json({ message: "Peso y volumen deben ser valores numéricos positivos" });
  const updated = await prisma.route.update({
    where: { id: route.id },
    data: {
      serviceDate: date ? new Date(`${date}T00:00:00`) : undefined,
      deliveryDate: deliveryDate === undefined ? undefined : deliveryDate ? new Date(`${deliveryDate}T00:00:00`) : null,
      startAt: startTime ? startAt(date || route.serviceDate.toISOString().slice(0, 10), startTime) : undefined,
      origin,
      destination,
      weightKg,
      volumeM3,
      documentType,
      documentNumber,
      status,
      driverId: driverId === undefined ? undefined : Number(driverId),
      vehicleId: vehicleId === undefined ? undefined : Number(vehicleId),
    },
    include: routeInclude,
  });

  if (Array.isArray(stops)) {
    const currentStops = await prisma.delivery.findMany({
      where: { routeId: route.id },
      select: { id: true, clientName: true, address: true, guideNumber: true, status: true },
    });
    const stopChanges = planRouteStopChanges(currentStops, stops);
    const assignableStops = await prisma.delivery.findMany({
      where: { id: { in: stopChanges.toUpdate.filter((stop) => !stopChanges.currentMap.has(stop.id)).map((stop) => stop.id) }, routeId: null },
      select: { id: true, status: true },
    });
    const assignableIds = new Set(assignableStops.map((stop) => stop.id));
    const toAssign = stopChanges.toUpdate.filter((stop) => !stopChanges.currentMap.has(stop.id) && assignableIds.has(stop.id));
    const toUpdate = stopChanges.toUpdate.filter((stop) => stopChanges.currentMap.has(stop.id));
    if (toAssign.length && !["draft", "planned"].includes(route.status)) return res.status(400).json({ message: "Solo se pueden asociar entregas a rutas en borrador o planificadas" });
    const invalidStop = toUpdate.find((stop) => !canTransitionDelivery(stopChanges.currentMap.get(stop.id)?.status, stop.status));
    if (invalidStop) return res.status(400).json({ message: `Transición de entrega no permitida: ${stopChanges.currentMap.get(invalidStop.id)?.status} a ${invalidStop.status}` });
    const unknownStops = stopChanges.toUpdate.filter((stop) => !stopChanges.currentMap.has(stop.id) && !assignableIds.has(stop.id));
    if (unknownStops.length) return res.status(400).json({ message: "Una o más entregas no están disponibles para asignar" });

    await prisma.$transaction(async (tx) => {
      if (stopChanges.toRemove.length) {
        await tx.delivery.updateMany({
          where: { id: { in: stopChanges.toRemove.map((stop) => stop.id) } },
          data: { routeId: null, driverId: null },
        });
      }

      for (const stop of stopChanges.toCreate) {
        await tx.delivery.create({
          data: {
            routeId: route.id,
            driverId: driverId == null ? route.driverId : Number(driverId),
            clientName: stop.client,
            address: stop.address,
            guideNumber: stop.guideNumber,
            status: "pending",
          },
        });
      }

      for (const stop of toAssign) {
        await tx.delivery.update({
          where: { id: stop.id },
          data: {
            routeId: route.id,
            driverId: driverId == null ? route.driverId : Number(driverId),
            clientName: stop.client,
            address: stop.address,
            guideNumber: stop.guideNumber,
            status: route.status === "planned" ? "planned" : "pending",
          },
        });
      }

      for (const stop of toUpdate) {
        await tx.delivery.update({
          where: { id: stop.id },
          data: {
            routeId: route.id,
            driverId: driverId == null ? route.driverId : Number(driverId),
            clientName: stop.client,
            address: stop.address,
            guideNumber: stop.guideNumber,
            status: stop.status,
          },
        });
      }
    });
  }

  const finalRoute = await prisma.route.findUnique({ where: { id: route.id }, include: routeInclude });
  if (status === "planned") {
    await prisma.delivery.updateMany({ where: { routeId: route.id, status: "pending" }, data: { status: "planned" } });
  }
  await logAudit({ action: "route_updated", userId: req.user.sub, entity: "route", entityId: route.id });
  const routeWithUpdatedStops = status === "planned" ? await prisma.route.findUnique({ where: { id: route.id }, include: routeInclude }) : finalRoute;
  res.json(toRoute(routeWithUpdatedStops));
};

export const deleteRoute = async (req, res) => {
  const id = Number(req.params.id);
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) return res.status(404).json({ message: "Ruta no encontrada" });
  await prisma.$transaction([prisma.delivery.updateMany({ where: { routeId: id }, data: { routeId: null, driverId: null } }), prisma.route.delete({ where: { id } })]);
  await logAudit({ action: "route_deleted", userId: req.user.sub, entity: "route", entityId: id });
  res.status(204).send();
};

export const optimizeRoute = async (req, res) => {
  const route = await prisma.route.findUnique({ where: { id: Number(req.params.id) }, include: routeInclude });
  if (!route) return res.status(404).json({ message: "Ruta no encontrada" });
  const nextStatus = route.status === "draft" ? "planned" : route.status;
  if (!canTransitionRoute(route.status, nextStatus)) return res.status(400).json({ message: "La ruta no se puede optimizar en su estado actual" });
  const updated = await prisma.route.update({ where: { id: route.id }, data: { status: nextStatus }, include: routeInclude });
  if (nextStatus === "planned") await prisma.delivery.updateMany({ where: { routeId: route.id, status: "pending" }, data: { status: "planned" } });
  await logAudit({ action: "route_optimized", userId: req.user.sub, entity: "route", entityId: route.id });
  const routeWithUpdatedStops = nextStatus === "planned" ? await prisma.route.findUnique({ where: { id: route.id }, include: routeInclude }) : updated;
  res.json(toRoute(routeWithUpdatedStops));
};
