const OPERATIONAL_TIME_ZONE = "America/Santiago";

export const getOperationalDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const parseDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
};

const timeOfDayPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

// La hora de inicio es hora de pared de America/Santiago y se guarda como componentes UTC,
// igual que las fechas sin hora: escritura y lectura no dependen de la zona horaria del servidor.
export const parseOperationalStartAt = (date, time) => {
  if (!parseDateOnly(date) || typeof time !== "string" || !timeOfDayPattern.test(time)) return null;
  return new Date(`${date}T${time}:00.000Z`);
};

export const formatOperationalTime = (value) => value.toISOString().slice(11, 16);
