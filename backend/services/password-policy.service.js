export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;
const MIN_DISTINCT_CHARACTERS = 4;
const COMMON_PASSWORDS = new Set([
  "password", "password1", "passw0rd", "contrasena", "contraseña", "qwertyui", "qwerty123", "asdfghjk",
  "iloveyou", "abc12345", "abcd1234", "admin123", "administrador", "conductor", "conductor1", "chofer123",
  "vgvconnect", "vgv12345", "12345678", "123456789", "1234567890", "87654321", "12341234", "11223344",
]);

const isSequential = (value) => {
  const codes = [...value].map((character) => character.codePointAt(0));
  const step = codes[1] - codes[0];
  return Math.abs(step) === 1 && codes.every((code, index) => index === 0 || code - codes[index - 1] === step);
};

// Solo se aplica al asignar credenciales nuevas; las contraseñas existentes no se revalidan.
export const validateNewPassword = (password, { username = "", name = "" } = {}) => {
  if (typeof password !== "string") return "La contraseña debe ser texto";
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) return `La contraseña no puede superar ${MAX_PASSWORD_BYTES} bytes`;
  const normalized = password.toLowerCase();
  if (new Set(normalized).size < MIN_DISTINCT_CHARACTERS) return "La contraseña tiene demasiados caracteres repetidos";
  if (COMMON_PASSWORDS.has(normalized) || isSequential(normalized)) return "La contraseña es demasiado común o predecible";
  const personalTerms = [username, ...String(name).split(/\s+/)].map((term) => String(term).trim().toLowerCase()).filter((term) => term.length >= 3);
  if (personalTerms.some((term) => normalized.includes(term))) return "La contraseña no puede contener el usuario ni el nombre";
  return null;
};
