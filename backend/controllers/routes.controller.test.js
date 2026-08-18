import assert from "node:assert/strict";
import { planRouteStopChanges } from "./routes.controller.js";

const currentStops = [
  { id: 10, clientName: "Cliente A", address: "Calle 1", guideNumber: "GD-001", status: "pending" },
  { id: 11, clientName: "Cliente B", address: "Calle 2", guideNumber: "GD-002", status: "planned" },
];

const incomingStops = [
  { id: 10, client: "Cliente A", address: "Calle 1", guideNumber: "GD-001", status: "in_progress" },
  { client: "Cliente C", address: "Calle 3", guideNumber: "GD-003", status: "pending" },
];

const result = planRouteStopChanges(currentStops, incomingStops);

assert.equal(result.toRemove.length, 1);
assert.equal(result.toRemove[0].id, 11);
assert.equal(result.toUpdate.length, 1);
assert.equal(result.toUpdate[0].client, "Cliente A");
assert.equal(result.toCreate.length, 1);
assert.equal(result.toCreate[0].client, "Cliente C");

console.log("route stop sync regression ok");
