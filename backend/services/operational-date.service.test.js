import assert from "node:assert/strict";
import { getOperationalDate, parseDateOnly } from "./operational-date.service.js";

assert.equal(getOperationalDate(new Date("2026-11-04T02:59:59.000Z")), "2026-11-03");
assert.equal(getOperationalDate(new Date("2026-11-04T03:00:00.000Z")), "2026-11-04");
assert.equal(getOperationalDate(new Date("2026-07-01T03:59:59.000Z")), "2026-06-30");
assert.equal(getOperationalDate(new Date("2026-07-01T04:00:00.000Z")), "2026-07-01");
assert.equal(parseDateOnly("2026-11-04").toISOString(), "2026-11-04T00:00:00.000Z");
assert.equal(parseDateOnly("2026-02-30"), null);
assert.equal(parseDateOnly("04-11-2026"), null);

console.log("PASS operational dates use America/Santiago across winter and summer midnight");
