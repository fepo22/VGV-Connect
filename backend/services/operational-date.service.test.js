import assert from "node:assert/strict";
import { formatOperationalTime, getOperationalDate, parseDateOnly, parseOperationalStartAt } from "./operational-date.service.js";

assert.equal(getOperationalDate(new Date("2026-11-04T02:59:59.000Z")), "2026-11-03");
assert.equal(getOperationalDate(new Date("2026-11-04T03:00:00.000Z")), "2026-11-04");
assert.equal(getOperationalDate(new Date("2026-07-01T03:59:59.000Z")), "2026-06-30");
assert.equal(getOperationalDate(new Date("2026-07-01T04:00:00.000Z")), "2026-07-01");
assert.equal(parseDateOnly("2026-11-04").toISOString(), "2026-11-04T00:00:00.000Z");
assert.equal(parseDateOnly("2026-02-30"), null);
assert.equal(parseDateOnly("04-11-2026"), null);

console.log("PASS operational dates use America/Santiago across winter and summer midnight");

const originalTimeZone = process.env.TZ;
// Verano e invierno de Chile, cambios de horario (2026-09-06, 2027-04-04) y bordes de medianoche.
const dates = ["2027-01-15", "2026-07-01", "2026-09-06", "2027-04-04", "2026-12-31"];
const times = ["00:00", "00:30", "07:15", "08:00", "11:00", "20:59", "21:00", "23:30", "23:59"];
for (const timeZone of ["America/Santiago", "UTC", "Asia/Tokyo", "America/New_York", "Pacific/Kiritimati"]) {
  process.env.TZ = timeZone;
  for (const date of dates) {
    for (const time of times) {
      let startAt = parseOperationalStartAt(date, time);
      for (let save = 0; save < 3; save += 1) {
        assert.equal(formatOperationalTime(startAt), time, `${timeZone} ${date} ${time} guardado ${save}`);
        assert.equal(startAt.toISOString().slice(0, 10), date, `${timeZone} ${date} ${time} conserva el día`);
        startAt = parseOperationalStartAt(startAt.toISOString().slice(0, 10), formatOperationalTime(startAt));
      }
    }
  }
}
if (originalTimeZone === undefined) delete process.env.TZ;
else process.env.TZ = originalTimeZone;
// Filas históricas: el valor almacenado se lee sin reinterpretarlo.
assert.equal(formatOperationalTime(new Date("2026-08-18T08:00:00.000Z")), "08:00");
for (const [date, time] of [["2027-01-15", "24:00"], ["2027-01-15", "8:00"], ["2027-01-15", "08:00:00"], ["2027-01-15", "08:60"], ["2027-01-15", undefined], ["2027-02-30", "08:00"]]) {
  assert.equal(parseOperationalStartAt(date, time), null, `${date} ${time} debe rechazarse`);
}
console.log("PASS route start time round-trips unchanged across server time zones, DST changes and midnight");
