import assert from "node:assert/strict";
import { planRouteStopChanges } from "./routes.controller.js";
import { canTransitionDelivery, canTransitionRoute } from "../services/status-transitions.service.js";

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

const createPlan = planRouteStopChanges([], [{ client: "Cliente nuevo", address: "Calle 4", guideNumber: "GD-004", status: "pending" }]);
assert.equal(createPlan.toCreate.length, 1, "crear ruta prepara una nueva entrega");

const editPlan = planRouteStopChanges(currentStops, [{ id: 10, client: "Cliente A editado", address: "Calle 10", guideNumber: "GD-001", status: "in_progress" }, { id: 11, client: "Cliente B", address: "Calle 2", guideNumber: "GD-002", status: "planned" }]);
assert.equal(editPlan.toUpdate.length, 2, "editar ruta conserva y actualiza sus puntos");
assert.equal(editPlan.toUpdate[0].client, "Cliente A editado");

const unassignPlan = planRouteStopChanges(currentStops, [{ id: 10, client: "Cliente A", address: "Calle 1", guideNumber: "GD-001", status: "pending" }]);
assert.deepEqual(unassignPlan.toRemove.map((stop) => stop.id), [11], "quitar un punto lo deja disponible para reasignar");

const deletePlan = planRouteStopChanges(currentStops, []);
assert.deepEqual(deletePlan.toRemove.map((stop) => stop.id), [10, 11], "eliminar una ruta desasigna todos sus puntos");

assert.equal(canTransitionRoute("draft", "planned"), true);
assert.equal(canTransitionRoute("planned", "completed"), false);
assert.equal(canTransitionRoute("completed", "in_progress"), false);
assert.equal(canTransitionDelivery("pending", "in_progress"), true);
assert.equal(canTransitionDelivery("in_progress", "completed"), true);
assert.equal(canTransitionDelivery("completed", "in_progress"), false);

console.log("route stop sync and status transitions regression ok");
