import assert from "node:assert/strict";
import { getOperationalDate } from "./operationalDate.js";
import { isSuccessfulDeliveryStatus, isTerminalDeliveryStatus } from "./deliveryStatus.js";
import { groupRouteStops, hasRouteChanges, mergeRouteFormState } from "./routePlanner.js";

assert.equal(getOperationalDate(new Date("2026-11-04T02:59:59.000Z")), "2026-11-03");
assert.equal(getOperationalDate(new Date("2026-11-04T03:00:00.000Z")), "2026-11-04");
assert.equal(getOperationalDate(new Date("2026-07-01T03:59:59.000Z")), "2026-06-30");
assert.equal(getOperationalDate(new Date("2026-07-01T04:00:00.000Z")), "2026-07-01");

for (const status of ["completed", "rejected", "not_found"]) assert.equal(isTerminalDeliveryStatus(status), true);
assert.equal(isSuccessfulDeliveryStatus("completed"), true);
assert.equal(isSuccessfulDeliveryStatus("rejected"), false);
assert.equal(isTerminalDeliveryStatus("planned"), false);

const original = {
  id: 1,
  date: "2026-11-04",
  startTime: "08:00",
  origin: "Origen",
  destination: "Destino",
  driverId: 7,
  vehicleId: 10,
  stops: [{ id: 11, client: "Cliente", address: "Dirección", guideNumber: "GD-1", status: "pending" }],
};
const serverRefresh = {
  ...original,
  status: "planned",
  stops: [{ ...original.stops[0], status: "planned" }],
};
const localForm = {
  date: original.date,
  startTime: original.startTime,
  origin: original.origin,
  destination: "Destino editado sin guardar",
  driverId: "7",
  vehicleId: "10",
  weightKg: "",
  volumeM3: "",
  deliveryDate: "",
  stops: [{ ...original.stops[0] }],
};
assert.equal(hasRouteChanges(original, localForm, "2026-11-04"), true);
const merged = mergeRouteFormState(original, serverRefresh, localForm, "2026-11-04");
assert.equal(merged.destination, "Destino editado sin guardar");
assert.equal(merged.stops[0].status, "planned");
assert.equal(hasRouteChanges(serverRefresh, merged, "2026-11-04"), true);

const sameGroup = groupRouteStops([
  { id: 1, client: "Cliente", address: "Calle 1", guideNumber: "GD-1", status: "completed" },
  { id: 2, client: "Cliente", address: "Calle 1", guideNumber: "GD-2", status: "pending" },
], "Punto");
assert.equal(sameGroup.length, 1);
assert.equal(sameGroup[0].status, "mixed");
assert.deepEqual(sameGroup[0].stops.map((stop) => stop.status), ["completed", "pending"]);
assert.deepEqual(sameGroup[0].documents, ["GD-1", "GD-2"]);

console.log("PASS frontend helpers preserve terminal outcomes, pending statuses, local edits, and individual grouped stops");
