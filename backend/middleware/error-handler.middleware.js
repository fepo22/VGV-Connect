import { randomUUID } from "node:crypto";

export const INTERNAL_ERROR_MESSAGE = "Ocurrió un error interno en el servidor. Intenta nuevamente en unos minutos.";

const maxLoggedMessageLength = 500;
const maxLoggedStackFrames = 15;

// Prisma incluye en el mensaje la invocación completa con los valores enviados (datos personales, hashes o fotos);
// solo se registra la última línea, que describe el problema.
const loggableMessage = (error) => {
  const message = String(error?.message ?? error ?? "");
  const text = /^PrismaClient/.test(error?.name || "") ? message.trim().split("\n").filter((line) => line.trim()).at(-1) || "" : message;
  return text.length > maxLoggedMessageLength ? `${text.slice(0, maxLoggedMessageLength)}…` : text;
};

const stackFrames = (error) => String(error?.stack || "")
  .split("\n")
  .filter((line) => /^\s+at\s/.test(line))
  .slice(0, maxLoggedStackFrames)
  .map((line) => line.trim());

// Manejador final: la respuesta pública nunca incluye detalles internos; el diagnóstico queda solo en el registro del servidor.
// Express lo reconoce como manejador de errores solo si declara los cuatro parámetros.
export const errorHandler = (error, req, res, next) => {
  const status = error?.status ?? error?.statusCode;
  // Los 4xx generados por Express (JSON mal formado, cuerpo demasiado grande) conservan su comportamiento original.
  if (Number.isInteger(status) && status >= 400 && status < 500) return next(error);

  const errorId = randomUUID();
  console.error("[api] Error interno", JSON.stringify({
    errorId,
    method: req.method,
    path: String(req.originalUrl || req.url || "").split("?")[0],
    name: error?.name,
    code: error?.code,
    target: error?.meta?.target,
    message: loggableMessage(error),
    stack: stackFrames(error),
  }));

  if (res.headersSent) {
    req.socket?.destroy();
    return undefined;
  }
  return res.status(500).json({ message: INTERNAL_ERROR_MESSAGE, errorId });
};
