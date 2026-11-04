import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

async function loadModule(path, dependencies) {
  const context = createContext({ console: { log() {} } });
  const module = new SourceTextModule(await readFile(new URL(path, import.meta.url), "utf8"), { context });
  await module.link((specifier) => {
    assert.ok(Object.hasOwn(dependencies, specifier), `Unmocked dependency: ${specifier}`);
    const exports = dependencies[specifier];
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const day = new Date();
day.setUTCHours(0, 0, 0, 0);
const db = {
  user: [
    { id: 1, name: "Admin", username: "admin-test", role: "admin", defaultVehicleId: null },
    { id: 2, name: "Planificador", username: "planner-test", role: "route_planner", defaultVehicleId: null },
    { id: 3, name: "Facturacion", username: "billing-test", role: "billing", defaultVehicleId: null },
    { id: 7, name: "Conductor A", username: "driver-a", role: "driver", defaultVehicleId: 30 },
    { id: 8, name: "Conductor B", username: "driver-b", role: "driver", defaultVehicleId: 31 },
    { id: 9, name: "Conductor C", username: "driver-c", role: "driver", defaultVehicleId: null },
  ],
  vehicle: [
    { id: 10, name: "Camion A ruta", licensePlate: "AA-10" },
    { id: 11, name: "Camion B ruta", licensePlate: "BB-11" },
    { id: 30, name: "Camion A defecto", licensePlate: "AA-30" },
    { id: 31, name: "Camion B defecto", licensePlate: "BB-31" },
    { id: 40, name: "Camion libre", licensePlate: "ZZ-40" },
  ],
  route: [
    { id: 100, driverId: 7, vehicleId: 10, documentType: "delivery" },
    { id: 101, driverId: 7, vehicleId: 10, documentType: "pickup" },
    { id: 200, driverId: 8, vehicleId: 11, documentType: "delivery" },
    { id: 300, driverId: null, vehicleId: 40, documentType: "delivery" },
  ].map((route) => ({ ...route, serviceDate: day, deliveryDate: null, startAt: day, origin: "Bodega", destination: `Destino ${route.id}`, weightKg: null, volumeM3: null, documentNumber: `Ruta ${route.id}`, status: "planned" })),
  delivery: [
    { id: 1000, routeId: 100, driverId: 7, clientName: "Cliente A1" },
    { id: 1001, routeId: 100, driverId: 7, clientName: "Cliente A2" },
    { id: 1002, routeId: 101, driverId: 7, clientName: "Cliente A3" },
    { id: 2000, routeId: 200, driverId: 8, clientName: "Cliente Ajeno B" },
    { id: 3000, routeId: null, driverId: null, clientName: "Cliente Sin Asignar" },
    { id: 3001, routeId: 300, driverId: null, clientName: "Cliente Ruta Libre" },
  ].map((delivery) => ({ ...delivery, guideNumber: `G-${delivery.id}`, address: `Direccion ${delivery.id}`, status: "planned", latitude: null, longitude: null })),
};

const relations = {
  vehicle: {
    routes: (vehicle) => db.route.filter((route) => route.vehicleId === vehicle.id).map((row) => ["route", row]),
    defaultDrivers: (vehicle) => db.user.filter((user) => user.defaultVehicleId === vehicle.id).map((row) => ["user", row]),
  },
};

function matches(model, row, where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return condition.some((option) => matches(model, row, option));
    if (condition === null) return row[key] == null;
    if (typeof condition === "object" && "in" in condition) return condition.in.includes(row[key]);
    if (typeof condition === "object" && "gte" in condition) return row[key] >= condition.gte;
    if (typeof condition === "object" && "some" in condition) {
      const related = relations[model]?.[key];
      assert.ok(related, `Relation not supported by fake Prisma: ${model}.${key}`);
      return related(row).some(([relatedModel, relatedRow]) => matches(relatedModel, relatedRow, condition.some));
    }
    assert.ok(typeof condition !== "object", `Operator not supported by fake Prisma: ${model}.${key}`);
    return row[key] === condition;
  });
}

const pick = (row, select) => select ? Object.fromEntries(Object.keys(select).map((key) => [key, row[key]])) : { ...row };
const sortBy = (rows, orderBy) => {
  if (!orderBy) return rows;
  const [[key, direction]] = Object.entries(orderBy);
  return [...rows].sort((first, second) => (first[key] > second[key] ? 1 : first[key] < second[key] ? -1 : 0) * (direction === "desc" ? -1 : 1));
};
const withRouteInclude = (route, include) => !include ? { ...route } : {
  ...route,
  driver: route.driverId == null ? null : pick(db.user.find((user) => user.id === route.driverId), include.driver.select),
  vehicle: route.vehicleId == null ? null : { ...db.vehicle.find((vehicle) => vehicle.id === route.vehicleId) },
  deliveries: db.delivery.filter((delivery) => delivery.routeId === route.id).map((delivery) => ({ ...delivery })),
};

function createFakePrisma(queries) {
  const model = (name) => ({
    async findMany({ where, include, select, orderBy } = {}) {
      queries.push({ model: name, where });
      const rows = sortBy(db[name].filter((row) => matches(name, row, where)), orderBy);
      return rows.map((row) => name === "route" ? withRouteInclude(row, include) : pick(row, select));
    },
    async findUnique({ where, include }) {
      queries.push({ model: name, where, unique: true });
      const row = db[name].find((candidate) => candidate.id === where.id);
      return row ? (name === "route" ? withRouteInclude(row, include) : { ...row }) : null;
    },
  });
  return { user: model("user"), vehicle: model("vehicle"), route: model("route"), delivery: model("delivery") };
}

const queries = [];
const controller = await loadModule("./controllers/routes.controller.js", {
  "../prismaClient.js": { default: createFakePrisma(queries) },
  "../services/audit.service.js": { logAudit: async () => undefined },
  "../services/geocoding.service.js": { geocodeAddress: async () => null },
  "../services/status-transitions.service.js": { canTransitionDelivery: () => true, canTransitionRoute: () => true },
  "../services/operational-date.service.js": await import("./services/operational-date.service.js"),
});

async function callGetRoutes(user, query = {}) {
  queries.length = 0;
  let body;
  await controller.getRoutes({ user: { sub: user.id, role: user.role }, query }, { json(payload) { body = JSON.parse(JSON.stringify(payload)); return this; } });
  return { body, queries: [...queries] };
}

const roleUser = (id) => db.user.find((user) => user.id === id);
const driverA = roleUser(7);
const ids = (rows) => rows.map((row) => row.id).sort((first, second) => first - second);
const stopIds = (routes) => routes.flatMap((route) => [...route.stops.map((stop) => stop.id), ...route.deliveries.map((delivery) => delivery.id)]);
const foreignMarkers = ["Conductor B", "driver-b", "Conductor C", "driver-c", "BB-11", "BB-31", "ZZ-40", "Cliente Ajeno B", "Cliente Sin Asignar", "Cliente Ruta Libre", "G-2000", "G-3000", "G-3001"];

const own = await callGetRoutes(driverA);
const ownText = JSON.stringify(own.body);
assert.deepEqual(Object.keys(own.body).sort(), ["availableStops", "drivers", "routes", "vehicles"]);
assert.deepEqual(ids(own.body.routes), [100, 101]);
assert.ok(own.body.routes.every((route) => route.driverId === 7 && route.driver.id === 7));
assert.deepEqual([...new Set(stopIds(own.body.routes))].sort(), [1000, 1001, 1002]);
console.log("PASS 1: driver receives only own routes and the deliveries of those routes");

assert.deepEqual(own.body.drivers, []);
assert.ok(!own.queries.some((query) => query.model === "user"), "driver path must not query the driver catalogue");
for (const marker of foreignMarkers.slice(0, 4)) assert.ok(!ownText.includes(marker), `foreign driver data leaked: ${marker}`);
console.log("PASS 2: driver receives no other drivers or their data");

assert.deepEqual(own.body.vehicles.map((vehicle) => vehicle.licensePlate), ["AA-10", "AA-30"]);
assert.ok(own.body.routes.every((route) => [10, 30].includes(route.vehicle.id)));
const vehicleQuery = own.queries.find((query) => query.model === "vehicle");
const routeVehicleFilter = vehicleQuery.where.OR[0].routes.some;
assert.equal(routeVehicleFilter.driverId, 7);
assert.deepEqual(JSON.parse(JSON.stringify(routeVehicleFilter.status.in)), ["draft", "planned", "in_progress"]);
assert.equal(routeVehicleFilter.serviceDate.gte.toISOString(), day.toISOString());
assert.deepEqual(JSON.parse(JSON.stringify(vehicleQuery.where.OR[1])), { defaultDrivers: { some: { id: 7 } } });
console.log("PASS 3: driver receives only route and default vehicles, filtered in the Prisma query");

assert.deepEqual(own.body.availableStops, []);
assert.ok(!own.queries.some((query) => query.model === "delivery"), "driver path must not query unassigned deliveries");
for (const marker of foreignMarkers.slice(4)) assert.ok(!ownText.includes(marker), `foreign vehicle or delivery leaked: ${marker}`);
console.log("PASS 4: driver receives no unassigned or foreign deliveries");

const tamperedQueries = [{ driverId: "8" }, { driverId: "8", type: "delivery" }, { driverId: ["8", "7"] }, { driverId: "0" }, { type: "all" }];
for (const query of tamperedQueries) {
  const tampered = await callGetRoutes(driverA, query);
  const text = JSON.stringify(tampered.body);
  assert.ok(tampered.body.routes.every((route) => route.driverId === 7), `query ${JSON.stringify(query)} exposed foreign routes`);
  assert.deepEqual(tampered.body.drivers, []);
  assert.deepEqual(tampered.body.availableStops, []);
  assert.deepEqual(ids(tampered.body.vehicles), [10, 30]);
  for (const marker of foreignMarkers) assert.ok(!text.includes(marker), `query ${JSON.stringify(query)} leaked ${marker}`);
  assert.ok(tampered.queries.filter((entry) => entry.model === "route").every((entry) => entry.where.driverId === 7));
}
const pickupOnly = await callGetRoutes(driverA, { type: "pickup", driverId: "8" });
assert.deepEqual(ids(pickupOnly.body.routes), [101]);
assert.deepEqual(ids(pickupOnly.body.vehicles), [10, 30]);
const unassignedDriver = await callGetRoutes(roleUser(9), { driverId: "7" });
assert.deepEqual(unassignedDriver.body, { routes: [], drivers: [], vehicles: [], availableStops: [] });
const foreignRoute = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
await controller.getRoute({ user: { sub: 7, role: "driver" }, params: { id: "200" } }, foreignRoute);
assert.equal(foreignRoute.statusCode, 403);
console.log("PASS 5: query manipulation (driverId, type) cannot expose foreign data; GET /routes/:id still returns 403");

const staffExpectations = async (user) => {
  const all = await callGetRoutes(user);
  assert.deepEqual(ids(all.body.routes), [100, 101, 200, 300]);
  assert.deepEqual(all.body.drivers.map((driver) => driver.id), [7, 8, 9]);
  assert.deepEqual(Object.keys(all.body.drivers[0]).sort(), ["defaultVehicleId", "id", "name", "username"]);
  assert.deepEqual(ids(all.body.vehicles), [10, 11, 30, 31, 40]);
  assert.deepEqual(ids(all.body.availableStops), [3000]);
  const byDriver = await callGetRoutes(user, { driverId: "8" });
  assert.deepEqual(ids(byDriver.body.routes), [200]);
  assert.deepEqual(ids(byDriver.body.vehicles), [10, 11, 30, 31, 40]);
  const byType = await callGetRoutes(user, { type: "pickup" });
  assert.deepEqual(ids(byType.body.routes), [101]);
};
await staffExpectations(roleUser(1));
console.log("PASS 6: admin keeps full routes, drivers, vehicles, unassigned stops and filters");
await staffExpectations(roleUser(2));
console.log("PASS 7: route planner keeps full routes, drivers, vehicles, unassigned stops and filters");
await staffExpectations(roleUser(3));
console.log("PASS 8: billing keeps its current GET /routes access");

const shape = own.body.routes[0];
for (const key of ["id", "documentNumber", "status", "destination", "startTime", "vehicleName", "vehicleLicensePlate", "stops", "driverName", "date"]) assert.ok(Object.hasOwn(shape, key), `route field missing for frontend: ${key}`);
for (const key of ["id", "client", "address", "status", "sequence"]) assert.ok(Object.hasOwn(shape.stops[0], key), `stop field missing for frontend: ${key}`);
for (const key of ["id", "name", "licensePlate"]) assert.ok(Object.hasOwn(own.body.vehicles[0], key), `vehicle field missing for frontend: ${key}`);
console.log("PASS 9 (contract): driver response keeps the shape consumed by DashboardChofer and CheckVehiculo");
