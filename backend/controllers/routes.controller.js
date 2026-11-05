import prisma from "../prismaClient.js";
import { logAudit } from "../services/audit.service.js";
import { geocodeAddress } from "../services/geocoding.service.js";
import { formatOperationalTime, getOperationalDate, parseDateOnly, parseOperationalStartAt } from "../services/operational-date.service.js";
import { canTransitionDelivery, canTransitionRoute } from "../services/status-transitions.service.js";

const drivers = async () => prisma.user.findMany({ where: { role: "driver" }, select: { id: true, name: true, username: true, defaultVehicleId: true }, orderBy: { name: "asc" } });
const routeInclude = { driver: { select: { id: true, name: true } }, vehicle: true, deliveries: true };
const toRoute = (route) => ({ ...route, date: route.serviceDate.toISOString().slice(0, 10), deliveryDate: route.deliveryDate?.toISOString().slice(0, 10) || "", startTime: formatOperationalTime(route.startAt), weightKg: route.weightKg === null ? null : Number(route.weightKg), volumeM3: route.volumeM3 === null ? null : Number(route.volumeM3), driverName: route.driver?.name || "Sin asignar", vehicleName: route.vehicle?.name || "Sin camión", vehicleLicensePlate: route.vehicle?.licensePlate || "Patente pendiente", stopCount: route.deliveries.length, stops: route.deliveries.map((delivery, index) => ({ id: delivery.id, guideNumber: delivery.guideNumber, client: delivery.clientName, address: delivery.address, status: delivery.status, sequence: index + 1, location: delivery.latitude !== null && delivery.longitude !== null ? { lat: Number(delivery.latitude), lng: Number(delivery.longitude) } : null })), coordinates: route.deliveries.filter((delivery) => delivery.latitude !== null && delivery.longitude !== null).map((delivery) => ({ lat: Number(delivery.latitude), lng: Number(delivery.longitude) })) });
const nextRouteName = async (date, client = prisma) => {
  const dayStart = parseDateOnly(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const dailyRoutes = await client.route.count({ where: { serviceDate: { gte: dayStart, lt: dayEnd } } });
  const formattedDate = date.split("-").reverse().join("-");
  return `Ruta ${formattedDate} / ${String(dailyRoutes + 1).padStart(3, "0")}`;
};
const optionalDecimal = (value) => {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};
const terminalDeliveryStatuses = ["completed", "rejected", "not_found"];
const nonterminalDeliveryStatuses = ["pending", "planned", "in_progress"];
const positiveId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const runSerializableTransaction = (callback) =>
  prisma.$transaction(callback, { isolationLevel: "Serializable" });
const isTransactionConflict = (error) => error?.code === "P2034" || error?.code === "P2025";
const routeConflictMessage = "La ruta cambió durante esta operación. Recarga la información e inténtalo nuevamente.";
const routeTypes = new Set(["delivery", "pickup"]);
const normalizeRouteType = (value) => routeTypes.has(value) ? value : "delivery";

export const normalizeRouteStopInput = (stop = {}, fallbackStatus = "pending") => {
  const id = stop.id == null || stop.id === "" ? null : Number(stop.id);
  const client = String(stop.client || stop.clientName || "Punto de descarga").trim() || "Punto de descarga";
  const address = String(stop.address || stop.direccion || "").trim();
  const guideNumber = stop.guideNumber == null || stop.guideNumber === "" ? null : String(stop.guideNumber).trim();
  return { id, client, address, guideNumber, status: stop.status || fallbackStatus };
};

export const planRouteStopChanges = (currentStops = [], incomingStops = []) => {
  const currentMap = new Map((currentStops || []).filter((stop) => stop && stop.id != null).map((stop) => [Number(stop.id), stop]));
  const normalizedIncoming = (incomingStops || []).map((stop) =>
    normalizeRouteStopInput(stop, currentMap.get(Number(stop?.id))?.status || "pending"),
  );
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
  const routeType = req.query.type && routeTypes.has(req.query.type) ? req.query.type : undefined;
  const documentTypeFilter = routeType === "delivery" ? { in: ["delivery", "route"] } : routeType;
  const where = {
    ...(req.user.role === "driver" ? { driverId: Number(req.user.sub) } : req.query.driverId ? { driverId: Number(req.query.driverId) } : {}),
    ...(routeType ? { documentType: documentTypeFilter } : {}),
  };
  if (req.user.role === "driver") {
    // El conductor solo recibe sus rutas y los vehículos de esas rutas o su vehículo por defecto; nunca catálogos globales.
    const driverId = Number(req.user.sub);
    const today = parseDateOnly(getOperationalDate());
    const [routes, vehicleList] = await Promise.all([
      prisma.route.findMany({ where, include: routeInclude, orderBy: { serviceDate: "desc" } }),
      prisma.vehicle.findMany({
        where: {
          OR: [
            { routes: { some: { driverId, status: { in: ["draft", "planned", "in_progress"] }, serviceDate: { gte: today } } } },
            { defaultDrivers: { some: { id: driverId } } },
          ],
        },
        orderBy: { licensePlate: "asc" },
      }),
    ]);
    return res.json({ routes: routes.map(toRoute), drivers: [], vehicles: vehicleList, availableStops: [] });
  }
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
  const documentType = normalizeRouteType(req.body.documentType);
  if (!date || !startTime || !destination || driverId == null || vehicleId == null) return res.status(400).json({ message: "Chofer, patente, fecha, hora y destino son obligatorios" });
  if (!parseDateOnly(date) || (deliveryDate && !parseDateOnly(deliveryDate))) return res.status(400).json({ message: "La fecha de ruta no es válida" });
  const routeStartAt = parseOperationalStartAt(date, startTime);
  if (!routeStartAt) return res.status(400).json({ message: "La hora de inicio no es válida" });
  if (stops !== undefined && !Array.isArray(stops)) return res.status(400).json({ message: "Las paradas deben enviarse como una lista" });
  if ((stops || []).some((stop) => !stop || typeof stop !== "object" || Array.isArray(stop))) return res.status(400).json({ message: "Una o más paradas no son válidas" });
  const normalizedStops = (stops || []).map((stop) => normalizeRouteStopInput(stop, "pending"));
  if (normalizedStops.some((stop) => stop.status !== "pending")) return res.status(400).json({ message: "Las nuevas entregas deben comenzar pendientes" });
  const weightKg = optionalDecimal(rawWeightKg);
  const volumeM3 = optionalDecimal(rawVolumeM3);
  if ((rawWeightKg !== undefined && weightKg === undefined) || (rawVolumeM3 !== undefined && volumeM3 === undefined)) return res.status(400).json({ message: "Peso y volumen deben ser valores numéricos positivos" });

  const [driver, vehicle] = await Promise.all([
    prisma.user.findFirst({ where: { id: Number(driverId), role: "driver" } }),
    prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } }),
  ]);
  if (!driver || !vehicle) return res.status(400).json({ message: "Chofer o patente no válidos" });

  const [originLocation, destinationLocation] = await Promise.all([geocodeAddress(origin), geocodeAddress(destination)]);
  const routeWithStops = await prisma.$transaction(async (tx) => {
    const routeName = await nextRouteName(date, tx);
    const route = await tx.route.create({
      data: {
        serviceDate: parseDateOnly(date),
        deliveryDate: deliveryDate ? parseDateOnly(deliveryDate) : null,
        startAt: routeStartAt,
        origin: origin || "",
        destination,
        weightKg: weightKg ?? null,
        volumeM3: volumeM3 ?? null,
        documentType,
        documentNumber: routeName,
        driverId: driver.id,
        vehicleId: vehicle.id,
      },
      include: routeInclude,
    });

    if (normalizedStops.length) {
      const stopRows = normalizedStops.map((nextStop) => ({
        routeId: route.id,
        driverId: driver.id,
        clientName: nextStop.client,
        address: nextStop.address,
        guideNumber: nextStop.guideNumber,
        status: nextStop.status,
      }));
      await tx.delivery.createMany({ data: stopRows });
    }

    const result = await tx.route.findUnique({ where: { id: route.id }, include: routeInclude });
    await tx.auditLog.create({
      data: { action: "route_created", userId: Number(req.user.sub), entity: "route", entityId: route.id, metadata: { originLocation, destinationLocation } },
    });
    return result;
  });
  res.status(201).json({ ...toRoute(routeWithStops), originLocation, destinationLocation });
};

export const updateRoute = async (req, res) => {
  const id = positiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Identificador de ruta no válido" });
  const body = req.body || {};
  const { date, deliveryDate, startTime, origin, destination, documentType, documentNumber, status, stops } = body;
  const rawWeightKg = body.weightKg;
  const rawVolumeM3 = body.volumeM3;
  const driverChanged = body.driverId !== undefined;
  const vehicleChanged = body.vehicleId !== undefined;
  const nextDriverId = !driverChanged ? undefined : body.driverId === null ? null : positiveId(body.driverId);
  const nextVehicleId = !vehicleChanged ? undefined : body.vehicleId === null ? null : positiveId(body.vehicleId);
  if (driverChanged && body.driverId !== null && nextDriverId === null) return res.status(400).json({ message: "Conductor no válido" });
  if (vehicleChanged && body.vehicleId !== null && nextVehicleId === null) return res.status(400).json({ message: "Vehículo no válido" });
  if ((date !== undefined && !parseDateOnly(date)) || (deliveryDate && !parseDateOnly(deliveryDate))) return res.status(400).json({ message: "La fecha de ruta no es válida" });
  if (startTime && !parseOperationalStartAt(date || "2000-01-01", startTime)) return res.status(400).json({ message: "La hora de inicio no es válida" });
  if (stops !== undefined && !Array.isArray(stops)) return res.status(400).json({ message: "Las paradas deben enviarse como una lista" });
  if ((stops || []).some((stop) => !stop || typeof stop !== "object" || Array.isArray(stop))) return res.status(400).json({ message: "Una o más paradas no son válidas" });
  if ((stops || []).some((stop) => stop.id != null && stop.id !== "" && !positiveId(stop.id))) return res.status(400).json({ message: "Una o más paradas contienen identificadores no válidos" });

  const nextDocumentType = documentType === undefined ? undefined : normalizeRouteType(documentType);
  const weightKg = optionalDecimal(rawWeightKg);
  const volumeM3 = optionalDecimal(rawVolumeM3);
  if ((rawWeightKg !== undefined && weightKg === undefined) || (rawVolumeM3 !== undefined && volumeM3 === undefined)) return res.status(400).json({ message: "Peso y volumen deben ser valores numéricos positivos" });

  let result;
  try {
    result = await runSerializableTransaction(async (tx) => {
    const route = await tx.route.findUnique({ where: { id } });
    if (!route) return { error: { status: 404, message: "Ruta no encontrada" } };
    if (status !== undefined && !canTransitionRoute(route.status, status)) return { error: { status: 400, message: `Transición de ruta no permitida: ${route.status} a ${status}` } };

    const resolvedDriverId = driverChanged ? nextDriverId : route.driverId;
    const resolvedVehicleId = vehicleChanged ? nextVehicleId : route.vehicleId;
    if (driverChanged && resolvedDriverId !== null) {
      const driver = await tx.user.findFirst({ where: { id: resolvedDriverId, role: "driver" }, select: { id: true } });
      if (!driver) return { error: { status: 400, message: "Conductor no válido" } };
    }
    if (vehicleChanged && resolvedVehicleId !== null) {
      const vehicle = await tx.vehicle.findUnique({ where: { id: resolvedVehicleId }, select: { id: true } });
      if (!vehicle) return { error: { status: 400, message: "Vehículo no válido" } };
    }

    let stopChanges;
    let toAssign = [];
    let toUpdate = [];
    if (Array.isArray(stops)) {
      const currentStops = await tx.delivery.findMany({
        where: { routeId: route.id },
        select: { id: true, routeId: true, driverId: true, clientName: true, address: true, guideNumber: true, status: true },
      });
      stopChanges = planRouteStopChanges(currentStops, stops);
      const ids = stopChanges.toUpdate.map((stop) => stop.id);
      if (ids.some((stopId) => !Number.isSafeInteger(stopId) || stopId <= 0) || new Set(ids).size !== ids.length) {
        return { error: { status: 400, message: "Las paradas contienen identificadores no válidos o repetidos" } };
      }
      if (stopChanges.toRemove.some((stop) => terminalDeliveryStatuses.includes(stop.status))) {
        return { error: { status: 400, message: "No se pueden quitar entregas con resultado final" } };
      }
      if (stopChanges.toCreate.some((stop) => stop.status !== "pending")) {
        return { error: { status: 400, message: "Las nuevas entregas deben comenzar pendientes" } };
      }

      const assignableStops = await tx.delivery.findMany({
        where: { id: { in: stopChanges.toUpdate.filter((stop) => !stopChanges.currentMap.has(stop.id)).map((stop) => stop.id) }, routeId: null },
        select: { id: true, status: true },
      });
      const assignableIds = new Set(assignableStops.map((stop) => stop.id));
      toAssign = stopChanges.toUpdate.filter((stop) => !stopChanges.currentMap.has(stop.id) && assignableIds.has(stop.id));
      toUpdate = stopChanges.toUpdate.filter((stop) => stopChanges.currentMap.has(stop.id));
      if (toAssign.length && !["draft", "planned"].includes(route.status)) return { error: { status: 400, message: "Solo se pueden asociar entregas a rutas en borrador o planificadas" } };
      if (stopChanges.toCreate.length && !["draft", "planned"].includes(route.status)) return { error: { status: 400, message: "Solo se pueden agregar entregas a rutas en borrador o planificadas" } };
      if (assignableStops.some((stop) => terminalDeliveryStatuses.includes(stop.status))) return { error: { status: 400, message: "No se pueden asociar entregas con resultado final" } };
      if (assignableStops.some((stop) => !["pending", "planned"].includes(stop.status) || (route.status === "draft" && stop.status !== "pending"))) {
        return { error: { status: 400, message: "Una o más entregas no están en un estado válido para asociar a esta ruta" } };
      }

      const invalidStop = toUpdate.find((stop) => {
        const current = stopChanges.currentMap.get(stop.id);
        if (terminalDeliveryStatuses.includes(current.status)) {
          return stop.status !== current.status
            || stop.client !== current.clientName
            || stop.address !== current.address
            || stop.guideNumber !== current.guideNumber;
        }
        return terminalDeliveryStatuses.includes(stop.status) || !canTransitionDelivery(current.status, stop.status);
      });
      if (invalidStop) {
        const current = stopChanges.currentMap.get(invalidStop.id);
        const message = terminalDeliveryStatuses.includes(current.status)
          ? "Las entregas con resultado final no pueden modificarse desde la planificación"
          : terminalDeliveryStatuses.includes(invalidStop.status)
            ? "Los resultados finales deben registrarse desde el flujo operacional de entregas"
            : `Transición de entrega no permitida: ${current.status} a ${invalidStop.status}`;
        return { error: { status: 400, message } };
      }
      const unknownStops = stopChanges.toUpdate.filter((stop) => !stopChanges.currentMap.has(stop.id) && !assignableIds.has(stop.id));
      if (unknownStops.length) return { error: { status: 400, message: "Una o más entregas no están disponibles para asignar" } };
      if (status === "completed" && stopChanges.toRemove.length) {
        return { error: { status: 400, message: "No se puede completar una ruta mientras se quitan entregas pendientes" } };
      }
      if (status === "completed" && (stopChanges.toCreate.length || toAssign.length)) {
        return { error: { status: 400, message: "No se puede completar una ruta mientras se agregan entregas" } };
      }
    }

    if (status === "completed") {
      const unresolvedStops = await tx.delivery.count({
        where: {
          routeId: route.id,
          status: { notIn: terminalDeliveryStatuses },
          ...(stopChanges ? { id: { notIn: stopChanges.toRemove.map((stop) => stop.id) } } : {}),
        },
      });
      if (unresolvedStops) return { error: { status: 400, message: "No se puede completar la ruta mientras existan puntos sin resultado final" } };
    }

    const updatedRoute = await tx.route.update({
      where: { id: route.id },
      data: {
        serviceDate: date ? parseDateOnly(date) : undefined,
        deliveryDate: deliveryDate === undefined ? undefined : deliveryDate ? parseDateOnly(deliveryDate) : null,
        startAt: startTime ? parseOperationalStartAt(date || route.serviceDate.toISOString().slice(0, 10), startTime) : undefined,
        origin,
        destination,
        weightKg,
        volumeM3,
        documentType: nextDocumentType,
        documentNumber,
        status,
        driverId: driverChanged ? resolvedDriverId : undefined,
        vehicleId: vehicleChanged ? resolvedVehicleId : undefined,
      },
    });

    if (stopChanges) {
      if (stopChanges.toRemove.length) {
        await tx.delivery.updateMany({
          where: { id: { in: stopChanges.toRemove.map((stop) => stop.id) }, status: { notIn: terminalDeliveryStatuses } },
          data: { routeId: null, driverId: null },
        });
      }

      for (const stop of stopChanges.toCreate) {
        await tx.delivery.create({
          data: {
            routeId: route.id,
            driverId: resolvedDriverId,
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
            driverId: resolvedDriverId,
            clientName: stop.client,
            address: stop.address,
            guideNumber: stop.guideNumber,
            status: route.status === "planned" ? "planned" : "pending",
          },
        });
      }

      for (const stop of toUpdate) {
        const current = stopChanges.currentMap.get(stop.id);
        if (terminalDeliveryStatuses.includes(current.status)) continue;
        if (
          stop.client === current.clientName
          && stop.address === current.address
          && stop.guideNumber === current.guideNumber
          && stop.status === current.status
        ) continue;
        await tx.delivery.update({
          where: { id: stop.id },
          data: {
            routeId: route.id,
            driverId: driverChanged && resolvedDriverId !== route.driverId ? resolvedDriverId : undefined,
            clientName: stop.client,
            address: stop.address,
            guideNumber: stop.guideNumber,
            status: stop.status,
          },
        });
      }
    }

    if (driverChanged && resolvedDriverId !== route.driverId) {
      await tx.delivery.updateMany({
        where: { routeId: route.id, status: { in: nonterminalDeliveryStatuses } },
        data: { driverId: resolvedDriverId },
      });
    }
    if (status === "planned") {
      await tx.delivery.updateMany({ where: { routeId: route.id, status: "pending" }, data: { status: "planned" } });
    }

    await tx.auditLog.create({
      data: { action: "route_updated", userId: Number(req.user.sub), entity: "route", entityId: route.id, metadata: {} },
    });
    if (driverChanged && resolvedDriverId !== route.driverId) {
      await tx.auditLog.create({
        data: {
          action: "route_reassigned",
          userId: Number(req.user.sub),
          entity: "route",
          entityId: route.id,
          metadata: { fromDriverId: route.driverId, toDriverId: resolvedDriverId },
        },
      });
    }

    const finalRoute = await tx.route.findUnique({ where: { id: updatedRoute.id }, include: routeInclude });
    return { route: finalRoute };
    });
  } catch (error) {
    if (isTransactionConflict(error)) return res.status(409).json({ message: routeConflictMessage });
    throw error;
  }

  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  return res.json(toRoute(result.route));
};

export const deleteRoute = async (req, res) => {
  const id = positiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Identificador de ruta no válido" });
  let result;
  try {
    result = await runSerializableTransaction(async (tx) => {
    const route = await tx.route.findUnique({ where: { id } });
    if (!route) return { error: { status: 404, message: "Ruta no encontrada" } };
    const terminalCount = await tx.delivery.count({ where: { routeId: id, status: { in: terminalDeliveryStatuses } } });
    if (terminalCount) return { error: { status: 409, message: "La ruta conserva historial operativo y no puede eliminarse porque contiene entregas terminales" } };
    await tx.delivery.updateMany({
      where: { routeId: id, status: { notIn: terminalDeliveryStatuses } },
      data: { routeId: null, driverId: null },
    });
    await tx.route.delete({ where: { id } });
    await tx.auditLog.create({
      data: { action: "route_deleted", userId: Number(req.user.sub), entity: "route", entityId: id, metadata: {} },
    });
    return {};
    });
  } catch (error) {
    if (isTransactionConflict(error)) return res.status(409).json({ message: routeConflictMessage });
    throw error;
  }
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  return res.status(204).send();
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
