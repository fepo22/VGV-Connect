import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import express from "express";
import * as transitions from "./services/status-transitions.service.js";

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);

const makeDelivery = (id, status, routeId = 1, driverId = 7) => ({
  id,
  routeId,
  driverId,
  guideNumber: `G-${id}`,
  clientName: `Cliente ${id}`,
  address: `Dirección ${id}`,
  status,
  photoUrl: null,
  latitude: null,
  longitude: null,
  observations: null,
  weightKg: null,
  volumeM3: null,
  createdAt: today,
  updatedAt: today,
  deliveredAt: null,
});

const makeRoute = (id, driverId, vehicleId, status, serviceDate) => ({
  id,
  driverId,
  vehicleId,
  status,
  serviceDate,
  deliveryDate: null,
  startAt: serviceDate,
  origin: "Bodega",
  destination: "Destino",
  distanceKm: null,
  weightKg: null,
  volumeM3: null,
  documentType: "delivery",
  documentNumber: `Ruta ${id}`,
  createdAt: today,
  updatedAt: today,
});

const fixture = () => ({
  users: [
    { id: 1, name: "Admin", username: "admin", role: "admin", defaultVehicleId: null },
    { id: 2, name: "Planificador", username: "planner", role: "route_planner", defaultVehicleId: null },
    { id: 3, name: "Facturación", username: "billing", role: "billing", defaultVehicleId: null },
    { id: 7, name: "Conductor A", username: "driver-a", role: "driver", defaultVehicleId: 10 },
    { id: 8, name: "Conductor B", username: "driver-b", role: "driver", defaultVehicleId: 15 },
    { id: 9, name: "Usuario no conductor", username: "other", role: "billing", defaultVehicleId: null },
    { id: 16, name: "Conductor sin vehículo", username: "driver-empty", role: "driver", defaultVehicleId: null },
  ],
  vehicles: [10, 11, 12, 13, 14, 15].map((id) => ({ id, name: `Camión ${id}`, licensePlate: `AA-${id}`, maxWeightKg: null, maxVolumeM3: null })),
  routes: [
    makeRoute(1, 7, 13, "planned", today),
    makeRoute(2, 7, 11, "planned", yesterday),
    makeRoute(3, 7, 12, "completed", tomorrow),
    makeRoute(4, 8, 15, "planned", today),
  ],
  deliveries: [
    makeDelivery(101, "pending"),
    makeDelivery(102, "planned"),
    makeDelivery(103, "in_progress"),
    makeDelivery(104, "completed"),
    makeDelivery(105, "rejected"),
    makeDelivery(106, "not_found"),
    makeDelivery(201, "pending", null, null),
    makeDelivery(202, "planned", 4, 8),
  ],
  vehicleChecks: [
    { id: 1, driverId: 8, vehicleId: 15, checkDate: today, odometer: 100, odometerPhotoUrl: "https://drive.example/foreign", items: {}, observations: null, status: "ok", createdAt: today, updatedAt: today },
  ],
  auditLogs: [],
  deliveryEvents: [],
  failAudit: false,
  failTransactionConflict: false,
  simulateConcurrentConflict: false,
  nextDeliveryId: 300,
  nextVehicleCheckId: 2,
  nextRouteId: 5,
  failDeliveryUpdate: false,
  failVehicleCheckUpsert: false,
});

let db = fixture();
const calls = [];
let serializableTransactionsInFlight = 0;
const clone = (value) => structuredClone(value);

const matches = (row, where = {}) => Object.entries(where).every(([key, condition]) => {
  if (key === "OR") return condition.some((part) => matches(row, part));
  if (condition === null) return row[key] == null;
  if (condition && typeof condition === "object") {
    if ("in" in condition) return condition.in.includes(row[key]);
    if ("notIn" in condition) return !condition.notIn.includes(row[key]);
    if ("gte" in condition) return row[key] >= condition.gte;
    if ("not" in condition) return row[key] !== condition.not;
    return false;
  }
  return row[key] === condition;
});

const project = (row, select) => {
  if (!row) return null;
  if (!select) return clone(row);
  return Object.fromEntries(Object.keys(select).filter((key) => select[key] && key in row).map((key) => [key, clone(row[key])]));
};

const makePrisma = (getDb) => {
  const enrich = (model, row, include) => {
    if (!row || !include) return clone(row);
    const data = clone(row);
    if (model === "route") {
      if (include.driver) data.driver = project(getDb().users.find((user) => user.id === row.driverId), include.driver.select);
      if (include.vehicle) data.vehicle = project(getDb().vehicles.find((vehicle) => vehicle.id === row.vehicleId));
      if (include.deliveries) data.deliveries = getDb().deliveries.filter((delivery) => delivery.routeId === row.id).map((delivery) => clone(delivery));
    }
    if (model === "delivery") {
      if (include.driver) data.driver = project(getDb().users.find((user) => user.id === row.driverId), include.driver.select);
      if (include.route) data.route = project(getDb().routes.find((route) => route.id === row.routeId), include.route.select);
    }
    if (model === "vehicleCheck" && include.vehicle) {
      data.vehicle = project(getDb().vehicles.find((vehicle) => vehicle.id === row.vehicleId), include.vehicle.select);
    }
    return data;
  };

  const model = (name, table) => ({
    async findMany({ where, include, select, orderBy, take } = {}) {
      calls.push({ model: name, method: "findMany", where });
      let rows = getDb()[table].filter((row) => matches(row, where));
      if (orderBy) {
        const [key, direction] = Object.entries(orderBy)[0];
        rows = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (direction === "desc" ? -1 : 1));
      }
      if (take) rows = rows.slice(0, take);
      return rows.map((row) => include ? enrich(name, row, include) : project(row, select));
    },
    async findUnique({ where, include, select }) {
      calls.push({ model: name, method: "findUnique", where });
      let row;
      if (name === "vehicleCheck" && where.driverId_vehicleId_checkDate) {
        const key = where.driverId_vehicleId_checkDate;
        row = getDb()[table].find((item) =>
          item.driverId === key.driverId
          && item.vehicleId === key.vehicleId
          && item.checkDate.getTime() === key.checkDate.getTime(),
        );
      } else {
        row = getDb()[table].find((item) => item.id === where.id);
      }
      return include ? enrich(name, row, include) : project(row, select);
    },
    async findFirst({ where, include, select } = {}) {
      calls.push({ model: name, method: "findFirst", where });
      const row = getDb()[table].find((item) => matches(item, where));
      return include ? enrich(name, row, include) : project(row, select);
    },
    async count({ where } = {}) {
      calls.push({ model: name, method: "count", where });
      return getDb()[table].filter((row) => matches(row, where)).length;
    },
    async update({ where, data, include, select }) {
      calls.push({ model: name, method: "update", where, data });
      if (name === "delivery" && getDb().failDeliveryUpdate) throw new Error("simulated write failure");
      const row = getDb()[table].find((item) => item.id === where.id);
      if (!row) throw Object.assign(new Error("not found"), { code: "P2025" });
      Object.assign(row, Object.fromEntries(Object.entries(clone(data)).filter(([, value]) => value !== undefined)));
      return include ? enrich(name, row, include) : project(row, select);
    },
    async updateMany({ where, data }) {
      calls.push({ model: name, method: "updateMany", where });
      const rows = getDb()[table].filter((row) => matches(row, where));
      for (const row of rows) {
        if (name === "delivery" && getDb().failDeliveryUpdate) throw new Error("simulated write failure");
        Object.assign(row, clone(data));
      }
      return { count: rows.length };
    },
    async create({ data, include, select }) {
      calls.push({ model: name, method: "create", data });
      if (name === "auditLog" && getDb().failAudit) throw new Error("simulated audit failure");
      const nextId = {
        delivery: () => getDb().nextDeliveryId++,
        vehicleCheck: () => getDb().nextVehicleCheckId++,
        route: () => getDb().nextRouteId++,
        deliveryEvent: () => getDb().deliveryEvents.length + 1,
        auditLog: () => getDb().auditLogs.length + 1,
      }[name];
      const row = { id: nextId(), ...clone(data) };
      getDb()[table].push(row);
      return include ? enrich(name, row, include) : project(row, select);
    },
    async createMany({ data }) {
      for (const row of data) await this.create({ data: row });
      return { count: data.length };
    },
    async delete({ where }) {
      calls.push({ model: name, method: "delete", where });
      const index = getDb()[table].findIndex((item) => item.id === where.id);
      if (index < 0) throw Object.assign(new Error("not found"), { code: "P2025" });
      return getDb()[table].splice(index, 1)[0];
    },
    async upsert({ where, update, create, include }) {
      calls.push({ model: name, method: "upsert", where });
      if (name === "vehicleCheck" && getDb().failVehicleCheckUpsert) throw new Error("simulated check persistence failure");
      const key = where.driverId_vehicleId_checkDate;
      let row = getDb()[table].find((item) =>
        item.driverId === key.driverId
        && item.vehicleId === key.vehicleId
        && item.checkDate.getTime() === key.checkDate.getTime(),
      );
      if (row) Object.assign(row, clone(update));
      else {
        row = { id: getDb().nextVehicleCheckId++, ...clone(create) };
        getDb()[table].push(row);
      }
      return include ? enrich(name, row, include) : clone(row);
    },
  });

  return {
    user: model("user", "users"),
    vehicle: model("vehicle", "vehicles"),
    route: model("route", "routes"),
    delivery: model("delivery", "deliveries"),
    vehicleCheck: model("vehicleCheck", "vehicleChecks"),
    auditLog: model("auditLog", "auditLogs"),
    deliveryEvent: model("deliveryEvent", "deliveryEvents"),
    async $transaction(callback, options) {
      calls.push({ model: "$transaction", options });
      if (getDb().failTransactionConflict) throw Object.assign(new Error("simulated serializable conflict"), { code: "P2034" });
      const serializable = options?.isolationLevel === "Serializable";
      if (serializable && getDb().simulateConcurrentConflict && serializableTransactionsInFlight > 0) {
        throw Object.assign(new Error("simulated concurrent serializable conflict"), { code: "P2034" });
      }
      if (serializable) serializableTransactionsInFlight += 1;
      try {
        const working = clone(getDb());
        const tx = makePrisma(() => working);
        const result = await callback(tx);
        db = working;
        return result;
      } finally {
        if (serializable) serializableTransactionsInFlight -= 1;
      }
    },
  };
};

const prisma = makePrisma(() => db);
const loadModule = async (path, dependencies) => {
  const context = createContext({ Buffer, console: { log() {} } });
  const module = new SourceTextModule(await readFile(new URL(path, import.meta.url), "utf8"), { context });
  await module.link((specifier) => {
    assert.ok(Object.hasOwn(dependencies, specifier), `Unmocked dependency in ${path}: ${specifier}`);
    const exports = dependencies[specifier];
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
};

const routeController = await loadModule("./controllers/routes.controller.js", {
  "../prismaClient.js": { default: prisma },
  "../services/audit.service.js": {
    logAudit: async (entry) => prisma.auditLog.create({ data: { ...entry, userId: Number(entry.userId), metadata: entry.metadata || {} } }),
  },
  "../services/geocoding.service.js": { geocodeAddress: async () => null },
  "../services/status-transitions.service.js": transitions,
  "../services/operational-date.service.js": await import("./services/operational-date.service.js"),
});
let completeDeliveryDuringPhotoUpload = false;
const vehicleController = await loadModule("./controllers/vehicle-checks.controller.js", {
  "../prismaClient.js": { default: prisma },
  "../services/audit.service.js": {
    logAudit: async (entry) => prisma.auditLog.create({ data: { ...entry, userId: Number(entry.userId), metadata: entry.metadata || {} } }),
  },
  "../services/google-drive.service.js": {
    uploadPhoto: async (data, name) => {
      assert.match(data, /^data:image\/(?:jpeg|png|webp);base64,/i);
      return { url: `https://drive.google.com/file/d/${encodeURIComponent(name)}/view`, external: true };
    },
  },
  "../services/operational-date.service.js": await import("./services/operational-date.service.js"),
});
const deliveryController = await loadModule("./controllers/deliveries.controller.js", {
  "../prismaClient.js": { default: prisma },
  "../services/audit.service.js": { logAudit: async () => undefined, logDeliveryEvent: async () => undefined },
  "../services/google-drive.service.js": {
    uploadPhoto: async (data) => {
      if (completeDeliveryDuringPhotoUpload) {
        db.deliveries.find((delivery) => delivery.id === 101).status = "completed";
        completeDeliveryDuringPhotoUpload = false;
      }
      return { url: data, external: false };
    },
  },
  "../services/status-transitions.service.js": transitions,
});

const invoke = async (handler, req) => {
  const result = { statusCode: 200, body: undefined };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return this; },
    send(body) { result.body = body; return this; },
  };
  await handler(req, res);
  return result;
};
const request = (role, sub, body = {}, params = {}, query = {}) => ({
  user: { role, sub },
  body,
  params,
  query,
});
const deliverySnapshot = () => clone(db.deliveries);
const reset = () => {
  db = fixture();
  calls.length = 0;
};

reset();
const oldDriverTerminal = db.deliveries.filter((delivery) => [104, 105, 106].includes(delivery.id)).map((delivery) => delivery.driverId);
const beforeInvalidCreate = clone(db);
const createTerminal = await invoke(routeController.createRoute, request("route_planner", 2, {
  date: today.toISOString().slice(0, 10),
  startTime: "08:00",
  destination: "Destino nuevo",
  driverId: 7,
  vehicleId: 13,
  stops: [{ client: "Cliente", address: "Dirección", status: "completed" }],
}));
assert.equal(createTerminal.statusCode, 400);
assert.deepEqual(db, beforeInvalidCreate);
const reassigned = await invoke(routeController.updateRoute, request("route_planner", 2, { driverId: 8 }, { id: "1" }));
assert.equal(reassigned.statusCode, 200);
assert.equal(db.routes.find((route) => route.id === 1).driverId, 8);
assert.deepEqual(db.deliveries.filter((delivery) => delivery.routeId === 1 && ["pending", "planned", "in_progress"].includes(delivery.status)).map((delivery) => delivery.driverId), [8, 8, 8]);
assert.deepEqual(db.deliveries.filter((delivery) => [104, 105, 106].includes(delivery.id)).map((delivery) => delivery.driverId), oldDriverTerminal);
assert.deepEqual(db.deliveries.filter((delivery) => delivery.routeId === 1).map((delivery) => delivery.routeId), [1, 1, 1, 1, 1, 1]);
assert.ok(db.auditLogs.some((entry) => entry.action === "route_reassigned" && entry.userId === 2 && entry.entityId === 1 && entry.metadata.fromDriverId === 7 && entry.metadata.toDriverId === 8));
console.log("PASS route reassignment synchronizes pending/planned/in_progress, preserves terminal history, and audits the actor");

reset();
db.failAudit = true;
const beforeFailedCreateAudit = clone(db);
await assert.rejects(() => invoke(routeController.createRoute, request("route_planner", 2, {
  date: today.toISOString().slice(0, 10),
  startTime: "08:00",
  destination: "Destino transaccional",
  driverId: 7,
  vehicleId: 13,
  stops: [{ client: "Cliente", address: "Dirección", status: "pending" }],
})), /simulated audit failure/);
assert.deepEqual(db, beforeFailedCreateAudit);
assert.ok(calls.some((call) => call.model === "$transaction"), "route creation and audit must run in a transaction");
console.log("PASS createRoute rolls back route and stops when audit insertion fails");

reset();
const unchangedAssignments = deliverySnapshot();
calls.length = 0;
const unchangedStops = db.deliveries.filter((delivery) => delivery.routeId === 1).map((delivery) => ({
  id: delivery.id,
  client: delivery.clientName,
  address: delivery.address,
  guideNumber: delivery.guideNumber,
  status: delivery.status,
}));
const unchanged = await invoke(routeController.updateRoute, request("admin", 1, { destination: "Otro destino", stops: unchangedStops }, { id: "1" }));
assert.equal(unchanged.statusCode, 200);
assert.deepEqual(db.deliveries, unchangedAssignments);
assert.equal(calls.filter((call) => call.model === "delivery" && ["update", "updateMany"].includes(call.method)).length, 0);
console.log("PASS unchanged driver does not rewrite delivery assignments");

for (const body of [{ driverId: 999 }, { driverId: 9 }, { driverId: 8, vehicleId: 999 }]) {
  reset();
  const before = clone(db);
  const result = await invoke(routeController.updateRoute, request("admin", 1, body, { id: "1" }));
  assert.equal(result.statusCode, 400);
  assert.deepEqual(db, before);
}
console.log("PASS nonexistent/non-driver assignments and vehicles are rejected without writes");

reset();
const beforeTerminalRemove = clone(db);
const retainedStops = db.deliveries.filter((delivery) => delivery.routeId === 1 && delivery.id !== 104).map((delivery) => ({
  id: delivery.id,
  client: delivery.clientName,
  address: delivery.address,
  guideNumber: delivery.guideNumber,
  status: delivery.status,
}));
const terminalRemoval = await invoke(routeController.updateRoute, request("admin", 1, { destination: "Cambio no aplicado", stops: retainedStops }, { id: "1" }));
assert.equal(terminalRemoval.statusCode, 400);
assert.deepEqual(db, beforeTerminalRemove);
const terminalStatusChange = await invoke(routeController.updateRoute, request("admin", 1, {
  stops: db.deliveries.filter((delivery) => delivery.routeId === 1).map((delivery) => ({
    id: delivery.id,
    client: delivery.clientName,
    address: delivery.address,
    guideNumber: delivery.guideNumber,
    status: delivery.id === 103 ? "completed" : delivery.status,
  })),
}, { id: "1" }));
assert.equal(terminalStatusChange.statusCode, 400);
assert.deepEqual(db, beforeTerminalRemove);
console.log("PASS route PUT rejects removing terminal deliveries and cannot set final delivery outcomes");

reset();
const pendingAndTerminal = db.deliveries.filter((delivery) => delivery.routeId === 1 && delivery.id !== 101).map((delivery) => ({
  id: delivery.id,
  client: delivery.clientName,
  address: delivery.address,
  guideNumber: delivery.guideNumber,
  status: delivery.status,
}));
const removePending = await invoke(routeController.updateRoute, request("admin", 1, { stops: pendingAndTerminal }, { id: "1" }));
assert.equal(removePending.statusCode, 200);
assert.equal(db.deliveries.find((delivery) => delivery.id === 101).routeId, null);
assert.equal(db.deliveries.find((delivery) => delivery.id === 101).driverId, null);
assert.equal(db.deliveries.find((delivery) => delivery.id === 104).routeId, 1);
assert.equal(db.deliveries.find((delivery) => delivery.id === 104).driverId, 7);
console.log("PASS toRemove releases nonterminal deliveries and leaves terminal deliveries linked to their route");

reset();
db.failDeliveryUpdate = true;
const failedWriteSnapshot = clone(db);
await assert.rejects(() => invoke(routeController.updateRoute, request("admin", 1, {
  driverId: 8,
  stops: db.deliveries.filter((delivery) => delivery.routeId === 1).map((delivery) => ({
    id: delivery.id,
    client: delivery.clientName,
    address: delivery.address,
    guideNumber: delivery.guideNumber,
    status: delivery.status,
  })),
}, { id: "1" })), /simulated write failure/);
assert.deepEqual(db, failedWriteSnapshot);
console.log("PASS failed transactional write rolls back route, deliveries, and audit entries");

reset();
db.routes.find((route) => route.id === 1).status = "draft";
const planDraft = await invoke(routeController.updateRoute, request("admin", 1, { status: "planned" }, { id: "1" }));
assert.equal(planDraft.statusCode, 200);
assert.equal(db.routes.find((route) => route.id === 1).status, "planned");
assert.ok(db.deliveries.filter((delivery) => delivery.routeId === 1 && delivery.status === "pending").length === 0);
const postPlanStops = db.deliveries.filter((delivery) => delivery.routeId === 1).map((delivery) => ({
  id: delivery.id,
  client: delivery.clientName,
  address: delivery.address,
  guideNumber: delivery.guideNumber,
  status: delivery.status,
}));
const editPlanned = await invoke(routeController.updateRoute, request("admin", 1, { destination: "Destino editado", stops: postPlanStops }, { id: "1" }));
assert.equal(editPlanned.statusCode, 200);
assert.ok(db.deliveries.filter((delivery) => delivery.routeId === 1).every((delivery) => delivery.status !== "pending"));
console.log("PASS draft-to-planned updates stop statuses and allows a subsequent edit without stale pending states");

reset();
db.failTransactionConflict = true;
const updateConflict = await invoke(routeController.updateRoute, request("admin", 1, { driverId: 8 }, { id: "1" }));
assert.equal(updateConflict.statusCode, 409);
assert.match(updateConflict.body.message, /cambió durante esta operación/);
assert.ok(calls.some((call) => call.model === "$transaction" && call.options?.isolationLevel === "Serializable"));
reset();
db.failTransactionConflict = true;
const deleteConflictDueToSerialization = await invoke(routeController.deleteRoute, request("admin", 1, {}, { id: "1" }));
assert.equal(deleteConflictDueToSerialization.statusCode, 409);
console.log("PASS serializable route conflicts are returned as HTTP 409");

reset();
db.simulateConcurrentConflict = true;
const concurrentReassignments = await Promise.all([
  invoke(routeController.updateRoute, request("admin", 1, { driverId: 8 }, { id: "1" })),
  invoke(routeController.updateRoute, request("admin", 1, { driverId: 7 }, { id: "1" })),
]);
assert.deepEqual(concurrentReassignments.map((result) => result.statusCode).sort(), [200, 409]);
assert.equal(db.routes.find((route) => route.id === 1).driverId, 8);
assert.ok(db.deliveries.filter((delivery) => delivery.routeId === 1 && ["pending", "planned", "in_progress"].includes(delivery.status)).every((delivery) => delivery.driverId === 8));
assert.equal(db.auditLogs.filter((entry) => entry.action === "route_reassigned").length, 1);
console.log("PASS simultaneous route reassignment mock returns a conflict without diverging route and delivery ownership");

reset();
const beforeDeleteConflict = clone(db);
const deleteConflict = await invoke(routeController.deleteRoute, request("admin", 1, {}, { id: "1" }));
assert.equal(deleteConflict.statusCode, 409);
assert.match(deleteConflict.body.message, /conserva historial operativo.*entregas terminales/);
assert.deepEqual(db, beforeDeleteConflict);
reset();
db.deliveries = db.deliveries.filter((delivery) => delivery.routeId !== 1);
db.deliveries.push(makeDelivery(107, "planned"));
const deleteAllowed = await invoke(routeController.deleteRoute, request("admin", 1, {}, { id: "1" }));
assert.equal(deleteAllowed.statusCode, 204);
assert.ok(!db.routes.some((route) => route.id === 1));
assert.equal(db.deliveries.find((delivery) => delivery.id === 107).routeId, null);
assert.equal(db.deliveries.find((delivery) => delivery.id === 107).driverId, null);
assert.ok(db.auditLogs.some((entry) => entry.action === "route_deleted" && entry.entityId === 1));
console.log("PASS deleteRoute conflicts on terminal history and atomically releases deliveries when deletion is allowed");

const checkItems = { lights: { status: "ok" } };
const photo = "data:image/jpeg;base64,Zm90bw==";
const saveCheck = async (role, sub, body) => invoke(vehicleController.saveVehicleCheck, request(role, sub, body));
reset();
db.failAudit = true;
const beforeFailedCheckAudit = clone(db);
await assert.rejects(() => saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems }), /simulated audit failure/);
assert.deepEqual(db, beforeFailedCheckAudit);
reset();
db.failVehicleCheckUpsert = true;
const beforeFailedCheckPersistence = clone(db);
await assert.rejects(() => saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems }), /simulated check persistence failure/);
assert.deepEqual(db, beforeFailedCheckPersistence);
reset();
assert.equal((await saveCheck("driver", 7, { driverId: 8, vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems })).statusCode, 201);
assert.equal(db.vehicleChecks.at(-1).driverId, 7, "driver identity must come from the JWT");
assert.equal((await saveCheck("driver", 7, { vehicleId: 13, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems })).statusCode, 201);
for (const vehicleId of [11, 12, 14]) {
  const before = clone(db.vehicleChecks);
  const denied = await saveCheck("driver", 7, { vehicleId, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems });
  assert.equal(denied.statusCode, 403, `unauthorized vehicle ${vehicleId} accepted`);
  assert.deepEqual(db.vehicleChecks, before);
}
assert.equal((await saveCheck("driver", 16, { vehicleId: 14, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems })).statusCode, 403);
console.log("PASS vehicle checks allow default/current-route vehicles and reject historical, completed, unrelated, and unassigned vehicles");

reset();
const arbitraryUrl = await saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: "https://attacker.example/fake.jpg", items: checkItems });
assert.equal(arbitraryUrl.statusCode, 400);
assert.equal((await saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhotoUrl: "https://attacker.example/fake.jpg", items: checkItems })).statusCode, 400);
assert.equal(db.vehicleChecks.length, 1);
db.vehicleChecks.push({ id: 2, driverId: 7, vehicleId: 10, checkDate: new Date(`${today.toISOString().slice(0, 10)}T00:00:00`), odometer: 0, odometerPhotoUrl: "https://attacker.example/legacy.jpg", items: {}, observations: null, status: "pending", createdAt: today, updatedAt: today });
const legacyUrl = await saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: "https://attacker.example/legacy.jpg", items: checkItems });
assert.equal(legacyUrl.statusCode, 400, "arbitrary legacy URLs are not accepted as retained evidence");
const validPhoto = await saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems });
assert.equal(validPhoto.statusCode, 201);
const savedPhotoUrl = db.vehicleChecks.at(-1).odometerPhotoUrl;
const retainedPhoto = await saveCheck("driver", 7, { vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: savedPhotoUrl, items: checkItems });
assert.equal(retainedPhoto.statusCode, 201);
assert.equal(db.vehicleChecks.at(-1).odometerPhotoUrl, savedPhotoUrl);
assert.equal((await saveCheck("admin", 1, { driverId: 999, vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems })).statusCode, 400);
assert.equal((await saveCheck("admin", 1, { driverId: 9, vehicleId: 10, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems })).statusCode, 400);
const adminCheck = await saveCheck("admin", 1, { driverId: 8, vehicleId: 15, checkDate: today.toISOString().slice(0, 10), odometerPhoto: photo, items: checkItems });
assert.equal(adminCheck.statusCode, 201);
assert.equal(db.vehicleChecks.find((check) => check.driverId === 8 && check.vehicleId === 15).driverId, 8);
assert.ok(db.auditLogs.some((entry) => entry.action === "vehicle_check_saved" && entry.metadata.driverId === 8));
console.log("PASS vehicle-check evidence rejects arbitrary URLs, preserves only the stored URL, and admin validates/audits the target driver");

reset();
db.vehicleChecks.push({ id: 2, driverId: 7, vehicleId: 10, checkDate: today, odometer: 10, odometerPhotoUrl: "https://drive.example/own", items: {}, observations: null, status: "ok", createdAt: today, updatedAt: today });
const ownChecks = await invoke(vehicleController.getVehicleChecks, request("driver", 7, {}, {}, { driverId: "8" }));
assert.deepEqual(ownChecks.body.checks.map((check) => check.driverId), [7]);
const adminOtherChecks = await invoke(vehicleController.getVehicleChecks, request("admin", 1, {}, {}, { driverId: "8" }));
assert.deepEqual(adminOtherChecks.body.checks.map((check) => check.driverId), [8]);
assert.equal((await invoke(vehicleController.getVehicleChecks, request("admin", 1, {}, {}, { driverId: "9" }))).statusCode, 400);
console.log("PASS check reads derive driver scope from JWT and allow admin only to target an existing driver");

reset();
db.deliveries.push(makeDelivery(203, "pending", 4, 8));
const allRoles = ["admin", "route_planner", "billing"];
for (const role of allRoles) {
  const all = await invoke(deliveryController.getDeliveries, request(role, role === "admin" ? 1 : role === "route_planner" ? 2 : 3));
  assert.equal(all.body.length, db.deliveries.length, `${role} should retain full delivery access`);
}
const ownDeliveries = await invoke(deliveryController.getDeliveries, request("driver", 7, {}, {}, { driverId: "8" }));
assert.ok(ownDeliveries.body.every((delivery) => delivery.driverId === 7));
for (const driverId of ["abc", "", ["7", "8"], ["7"], "0"]) {
  assert.equal((await invoke(deliveryController.getDeliveries, request("admin", 1, {}, {}, { driverId }))).statusCode, 400);
}
console.log("PASS GET /deliveries preserves staff access, scopes drivers by JWT, ignores tampering, and rejects invalid/repeated filters");

reset();
const deliveryUpdate = await invoke(deliveryController.updateDeliveryStatus, request("driver", 7, { status: "in_progress" }, { id: "101" }));
assert.equal(deliveryUpdate.statusCode, 200);
assert.equal(db.deliveries.find((delivery) => delivery.id === 101).status, "in_progress");
assert.equal(db.deliveryEvents.at(-1).action, "delivery_updated");
assert.equal(db.auditLogs.at(-1).action, "delivery_updated");
assert.ok(calls.some((call) => call.model === "$transaction" && call.options?.isolationLevel === "Serializable"));

const terminalBefore = clone(db);
const terminalUpdate = await invoke(deliveryController.updateDeliveryStatus, request("driver", 7, { status: "completed" }, { id: "104" }));
assert.equal(terminalUpdate.statusCode, 409);
assert.deepEqual(db, terminalBefore);
assert.equal((await invoke(deliveryController.updateDeliveryStatus, request("driver", 7, { status: "in_progress" }, { id: "202" }))).statusCode, 403);
db.failTransactionConflict = true;
assert.equal((await invoke(deliveryController.updateDeliveryStatus, request("driver", 7, { status: "in_progress" }, { id: "101" }))).statusCode, 409);
reset();
const terminalPhotoBefore = clone(db);
assert.equal((await invoke(deliveryController.uploadDeliveryPhoto, request("driver", 7, { photoData: "data:image/jpeg;base64,QQ==" }, { id: "104" }))).statusCode, 409);
assert.deepEqual(db, terminalPhotoBefore);
completeDeliveryDuringPhotoUpload = true;
const photoRace = await invoke(deliveryController.uploadDeliveryPhoto, request("driver", 7, { photoData: "data:image/jpeg;base64,QQ==" }, { id: "101" }));
assert.equal(photoRace.statusCode, 409);
assert.equal(db.deliveries.find((delivery) => delivery.id === 101).photoUrl, null);
console.log("PASS delivery status writes serialize with route operations, reject terminal edits, and control conflicts");

reset();
db.deliveries = db.deliveries.map((delivery) => delivery.routeId === 1 ? { ...delivery, status: "pending" } : delivery);
db.simulateConcurrentConflict = true;
const simultaneousDeleteAndStatus = await Promise.all([
  invoke(routeController.deleteRoute, request("admin", 1, {}, { id: "1" })),
  invoke(deliveryController.updateDeliveryStatus, request("driver", 7, { status: "in_progress" }, { id: "101" })),
]);
assert.deepEqual(simultaneousDeleteAndStatus.map((result) => result.statusCode).sort(), [204, 409]);
assert.ok(!db.routes.some((route) => route.id === 1));
assert.ok(db.deliveries.filter((delivery) => delivery.id >= 101 && delivery.id <= 106).every((delivery) => delivery.routeId === null && delivery.driverId === null));
console.log("PASS simultaneous route deletion and delivery-state mock returns a conflict without partial assignment changes");

reset();
const app = express();
app.use(express.json());
const requireSession = (req, _res, next) => {
  req.user = { role: req.header("x-test-role") || "driver", sub: Number(req.header("x-test-id") || 7) };
  next();
};
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role)
  ? next()
  : res.status(403).json({ message: "No tienes permisos para esta acción" });
const routeStubs = routeController;
const vehicleStubs = vehicleController;
const deliveryStubs = { ...deliveryController, getDriverAuditLogs: (_req, res) => res.json([]) };
const routesRouter = await loadModule("./routes/routes.routes.js", {
  express: { Router: express.Router },
  "../controllers/routes.controller.js": routeStubs,
  "../middleware/auth.middleware.js": { requireRole },
  "../middleware/session.middleware.js": { requireSession },
});
const checksRouter = await loadModule("./routes/vehicle-checks.routes.js", {
  express: { Router: express.Router },
  "../controllers/vehicle-checks.controller.js": vehicleStubs,
  "../middleware/auth.middleware.js": { requireRole },
  "../middleware/session.middleware.js": { requireSession },
});
const deliveriesRouter = await loadModule("./routes/deliveries.routes.js", {
  express: { Router: express.Router },
  "../controllers/deliveries.controller.js": deliveryStubs,
  "../controllers/audit.controller.js": { getDriverAuditLogs: (_req, res) => res.json([]) },
  "../middleware/auth.middleware.js": { requireRole },
  "../middleware/session.middleware.js": { requireSession },
});
app.use("/routes", routesRouter.default);
app.use("/vehicle-checks", checksRouter.default);
app.use("/deliveries", deliveriesRouter.default);
const server = app.listen(0);
try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const httpCall = async (method, path, role, id, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-test-role": role, "x-test-id": String(id) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  for (const role of ["driver", "billing"]) {
    assert.equal((await httpCall("PUT", "/routes/1", role, role === "driver" ? 7 : 3, { driverId: 8 })).status, 403);
  }
  for (const role of ["route_planner", "billing"]) {
    assert.equal((await httpCall("GET", "/vehicle-checks?driverId=7", role, role === "route_planner" ? 2 : 3)).status, 403);
    assert.equal((await httpCall("POST", "/vehicle-checks", role, role === "route_planner" ? 2 : 3, {})).status, 403);
  }
  assert.equal((await httpCall("PUT", "/routes/1", "route_planner", 2, { driverId: 8 })).status, 200);
  assert.equal((await httpCall("GET", "/vehicle-checks?driverId=7", "admin", 1)).status, 200);
  console.log("PASS route and vehicle-check role middleware preserves planner/admin access and rejects driver/billing writes or reads");
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log("All assignment consistency regressions passed");
