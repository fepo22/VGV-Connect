import { deliveries } from "../data/deliveries.mock.js";
import { logAudit } from "../data/audit.mock.js";

const drivers = [
  { id: 1, name: "Carlos Mendoza" },
  { id: 2, name: "Ana Torres" },
  { id: 3, name: "Luis Rojas" },
];

const buildStops = (stopIds = deliveries.map((delivery) => delivery.id)) =>
  stopIds
    .map((stopId, index) => deliveries.find((delivery) => delivery.id === Number(stopId)))
    .filter(Boolean)
    .map((delivery, index) => ({
      id: delivery.id,
      client: delivery.cliente,
      address: delivery.direccion,
      status: delivery.estado,
      location: delivery.location || {
        lat: -33.45 - index * 0.02,
        lng: -70.66 + index * 0.01,
      },
      sequence: index + 1,
    }));

let routePlans = [
  {
    id: 1,
    name: "Ruta centro - turno mañana",
    date: new Date().toISOString().slice(0, 10),
    status: "planned",
    driverId: 1,
    driverName: drivers[0].name,
    stops: buildStops(),
  },
];

const withSummary = (route) => ({
  ...route,
  stopCount: route.stops.length,
  coordinates: route.stops.map((stop) => stop.location),
});

export const syncRouteDelivery = (delivery) => {
  const route = routePlans.find((item) => item.id === delivery.routeId);
  const stop = route?.stops.find((item) => item.id === delivery.id);
  if (stop) stop.status = delivery.estado;
  if (route && delivery.estado === "completed" && route.stops.every((item) => item.status === "completed")) {
    route.status = "completed";
  }
};

const syncDeliveryAssignments = (route) => {
  route.stops.forEach((stop) => {
    const delivery = deliveries.find((item) => item.id === stop.id);
    if (delivery) {
      delivery.routeId = route.id;
      delivery.driverId = route.driverId;
    }
  });
};

export const getRoutes = (req, res) => {
  const driverId = req.query.driverId;
  const routes = driverId
    ? routePlans.filter((route) => route.driverId === Number(driverId))
    : routePlans;
  res.json({ routes: routes.map(withSummary), drivers, availableStops: buildStops() });
};

export const createRoute = (req, res) => {
  const { name, date, driverId, stopIds } = req.body;
  if (!name || !date) {
    return res.status(400).json({ message: "El nombre y la fecha son obligatorios" });
  }

  const driver = drivers.find((item) => item.id === Number(driverId));
  const route = {
    id: Date.now(),
    name,
    date,
    status: "draft",
    driverId: driver?.id || null,
    driverName: driver?.name || "Sin asignar",
    stops: buildStops(stopIds),
  };

  syncDeliveryAssignments(route);
  routePlans = [...routePlans, route];
  logAudit({ action: "route_created", userId: 10, role: "admin", entity: "route", entityId: route.id, metadata: { driverId: route.driverId, stopIds } });
  return res.status(201).json(withSummary(route));
};

export const updateRoute = (req, res) => {
  const route = routePlans.find((item) => item.id === Number(req.params.id));
  if (!route) return res.status(404).json({ message: "Ruta no encontrada" });

  const { name, date, status, driverId, stopIds } = req.body;
  const driver = drivers.find((item) => item.id === Number(driverId));
  deliveries.forEach((delivery) => {
    if (delivery.routeId === route.id) {
      delivery.routeId = null;
      delivery.driverId = null;
    }
  });
  Object.assign(route, {
    ...(name && { name }),
    ...(date && { date }),
    ...(status && { status }),
    ...(driverId !== undefined && { driverId: driver?.id || null, driverName: driver?.name || "Sin asignar" }),
    ...(stopIds && { stops: buildStops(stopIds) }),
  });

  syncDeliveryAssignments(route);
  logAudit({ action: "route_updated", userId: 10, role: "admin", entity: "route", entityId: route.id, metadata: { driverId, status, stopIds } });
  return res.json(withSummary(route));
};

export const optimizeRoute = (req, res) => {
  const route = routePlans.find((item) => item.id === Number(req.params.id));
  if (!route) return res.status(404).json({ message: "Ruta no encontrada" });

  route.stops = [...route.stops].sort((first, second) => {
    if (first.status === second.status) return first.id - second.id;
    return first.status === "in_route" ? -1 : 1;
  }).map((stop, index) => ({ ...stop, sequence: index + 1 }));

  route.status = route.status === "draft" ? "planned" : route.status;
  logAudit({ action: "route_optimized", userId: 10, role: "admin", entity: "route", entityId: route.id });
  return res.json(withSummary(route));
};