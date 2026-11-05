import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

// Entorno aislado: sin .env, con una base inalcanzable y fuera de producción, donde Express mostraría el stack por defecto.
const jwtSecret = randomBytes(32).toString("hex");
process.env.DOTENV_CONFIG_PATH = join(tmpdir(), `vgv-no-env-${randomUUID()}`);
process.env.DATABASE_URL = "postgresql://vgv_error_test:vgv_error_test@127.0.0.1:1/vgv_error_test";
process.env.JWT_SECRET = jwtSecret;
process.env.NODE_ENV = "development";
delete process.env.CORS_ORIGINS;
delete process.env.TRUST_PROXY;

const logged = [];
const originalConsoleError = console.error;
console.error = (...args) => logged.push(args.join(" "));

const { default: app } = await import("./src/app.js");
const { errorHandler, INTERNAL_ERROR_MESSAGE } = await import("./middleware/error-handler.middleware.js");

const internalDetails = [/\bat\s+\S+.*:\d+/, /[A-Z]:\\|[A-Z]:\/|file:\/\//i, /node_modules|\.js\b/, /prisma|invocation/i, /127\.0\.0\.1|postgres|database server/i, /\bselect\b|\bfrom "/i, /<html|<pre>/i];
const assertNoInternals = (text, label) => {
  for (const pattern of internalDetails) assert.doesNotMatch(text, pattern, `${label} leaks ${pattern}`);
};

const listen = (server) => new Promise((resolve) => server.listen(0, () => resolve(`http://127.0.0.1:${server.address().port}`)));
const request = async (baseUrl, path, { method = "GET", token, raw, body, headers = {} } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(raw !== undefined || body !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  return { status: response.status, type: response.headers.get("content-type") || "", text, body: /json/.test(response.headers.get("content-type") || "") ? JSON.parse(text) : undefined };
};

const appServer = app.listen(0);
await new Promise((resolve) => appServer.once("listening", resolve));
const appUrl = `http://127.0.0.1:${appServer.address().port}`;
const plannerToken = jwt.sign({ sub: 1, name: "Planificador", role: "route_planner", pwv: 0 }, jwtSecret, { algorithm: "HS256", expiresIn: "5m" });

try {
  // 1-4. Excepción inesperada real (Prisma no puede conectarse) a través de la app completa.
  logged.length = 0;
  let res = await request(appUrl, "/routes/abc", { token: plannerToken });
  assert.equal(res.status, 500);
  assert.match(res.type, /application\/json/);
  assert.equal(res.body.message, INTERNAL_ERROR_MESSAGE);
  assert.match(res.body.errorId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(Object.keys(res.body).sort(), ["errorId", "message"]);
  assertNoInternals(res.text, "Prisma 500 response");
  console.log("PASS 1-3: unexpected Prisma failure returns 500 with a generic JSON message, no stack, local paths or Prisma/database details");

  assert.equal(logged.length, 1, "The internal error must be logged exactly once");
  const entry = JSON.parse(logged[0].slice(logged[0].indexOf("{")));
  assert.equal(entry.errorId, res.body.errorId);
  assert.equal(entry.method, "GET");
  assert.equal(entry.path, "/routes/abc");
  assert.match(entry.name, /^PrismaClient/);
  assert.ok(entry.message.length > 0);
  assert.ok(entry.stack.length > 0 && entry.stack.every((frame) => frame.startsWith("at ")));
  assert.ok(!logged[0].includes(plannerToken) && !logged[0].includes(jwtSecret), "Credentials must not be logged");
  console.log("PASS 4: the original error is logged once with errorId, request line, error name, message and stack frames, without credentials");

  // 7. Errores de middleware de Express: el 500 de CORS se oculta; los 4xx (JSON, tamaño) conservan su comportamiento previo.
  logged.length = 0;
  res = await request(appUrl, "/health", { headers: { origin: "https://origen-no-permitido.example" } });
  assert.equal(res.status, 500);
  assert.deepEqual(Object.keys(res.body).sort(), ["errorId", "message"]);
  assert.equal(res.body.message, INTERNAL_ERROR_MESSAGE);
  assertNoInternals(res.text, "CORS 500 response");
  assert.equal(logged.length, 1);

  // Referencia: la misma app sin el manejador nuevo, para comparar los 4xx con el comportamiento original de Express.
  const baselineApp = express();
  baselineApp.use(express.json({ limit: "10mb" }));
  baselineApp.post("/auth/login", (_req, res) => res.status(200).end());
  const baselineServer = baselineApp.listen(0);
  await new Promise((resolve) => baselineServer.once("listening", resolve));
  const baselineUrl = `http://127.0.0.1:${baselineServer.address().port}`;
  const normalize = (text) => text.replace(/[A-Z]:\\[^\n<)]*|file:\/\/[^\n<)]*/gi, "<path>");
  try {
    logged.length = 0;
    for (const [label, raw, status] of [["Malformed JSON", "{\"identifier\":", 400], ["Payload too large", JSON.stringify({ identifier: "x".repeat(11 * 1024 * 1024) }), 413]]) {
      const current = await request(appUrl, "/auth/login", { method: "POST", raw });
      const original = await request(baselineUrl, "/auth/login", { method: "POST", raw });
      assert.equal(current.status, status, `${label} keeps its status`);
      assert.equal(current.type, original.type, `${label} keeps its content type`);
      assert.equal(normalize(current.text).split("\n")[0], normalize(original.text).split("\n")[0], `${label} keeps its original message`);
      assert.doesNotMatch(current.text, new RegExp(INTERNAL_ERROR_MESSAGE), `${label} is not replaced by the internal error message`);
    }
    assert.ok(!logged.some((line) => line.startsWith("[api] Error interno")), "Client errors from Express middleware are not logged as internal errors");
  } finally {
    await new Promise((resolve) => baselineServer.close(resolve));
  }
  console.log("PASS 7a: CORS 500 is generic JSON without stack or paths; malformed JSON (400) and oversized bodies (413) keep Express's original response");

  // 6. Respuestas funcionales 401 de la app real se mantienen.
  res = await request(appUrl, "/routes");
  assert.deepEqual([res.status, res.body], [401, { message: "Token requerido" }]);
  res = await request(appUrl, "/routes", { token: "no-es-un-jwt" });
  assert.deepEqual([res.status, res.body], [401, { message: "Token inválido o expirado" }]);
  res = await request(appUrl, "/health");
  assert.deepEqual([res.status, res.body], [200, { status: "ok" }]);
} finally {
  await new Promise((resolve) => appServer.close(resolve));
}

// 5-7. Manejador aislado: respuestas funcionales intactas y excepciones con datos sensibles.
const testApp = express();
testApp.use(express.json());
for (const [status, message] of [[400, "La hora de inicio no es válida"], [401, "Sesión revocada. Inicia sesión nuevamente."], [403, "No tienes permisos para esta acción"], [404, "Ruta no encontrada"], [409, "La ruta conserva historial operativo y no puede eliminarse porque contiene entregas terminales"]]) {
  testApp.get(`/functional/${status}`, (_req, res) => res.status(status).json({ message, ...(status === 403 ? { code: "PASSWORD_CHANGE_REQUIRED" } : {}) }));
}
testApp.get("/sync-throw", () => {
  throw new Error("select * from \"User\" where id = 1 failed in C:\\Users\\Usuario\\backend\\controllers\\x.js");
});
testApp.get("/async-throw", async () => {
  await Promise.resolve();
  throw new Error("connect ECONNREFUSED postgres://usuario:clave@db.interno:5432/vgv");
});
testApp.get("/prisma-validation", async () => {
  throw new Prisma.PrismaClientValidationError("\nInvalid `prisma.user.create()` invocation in\nC:\\backend\\controllers\\drivers.controller.js:42:7\n\n{\n  data: {\n    passwordHash: \"$2b$10$hash-secreto\",\n    photo: \"data:image/jpeg;base64,AAAA\"\n  }\n}\n\nArgument `username` is missing.", { clientVersion: "test" });
});
testApp.get("/client-error", (_req, _res, next) => next(Object.assign(new Error("detalle interno de not found"), { status: 404 })));
testApp.get("/after-headers", (_req, res, next) => {
  res.write("parcial");
  next(new Error("falla después de enviar cabeceras"));
});
testApp.use(errorHandler);
const testServer = testApp.listen(0);
await new Promise((resolve) => testServer.once("listening", resolve));
const testUrl = `http://127.0.0.1:${testServer.address().port}`;

try {
  logged.length = 0;
  for (const status of [400, 401, 403, 404, 409]) {
    const res = await request(testUrl, `/functional/${status}`);
    assert.equal(res.status, status);
    assert.ok(res.body.message && res.body.message !== INTERNAL_ERROR_MESSAGE, `Functional ${status} message must be preserved`);
    assert.equal(res.body.errorId, undefined);
  }
  assert.equal((await request(testUrl, "/functional/403")).body.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal(logged.length, 0, "Functional responses must not be logged as errors");
  console.log("PASS 5-6: functional 400/401/403/404/409 responses keep their status, message and code untouched and are not logged");

  for (const path of ["/sync-throw", "/async-throw", "/prisma-validation"]) {
    const res = await request(testUrl, path);
    assert.equal(res.status, 500);
    assert.equal(res.body.message, INTERNAL_ERROR_MESSAGE);
    assertNoInternals(res.text, path);
    assert.doesNotMatch(res.text, /ECONNREFUSED|clave|hash-secreto|base64|username/);
  }
  assert.equal(logged.length, 3);
  assert.match(logged[0], /select \* from/, "Ordinary error messages stay available for diagnosis");
  assert.match(logged[2], /Argument `username` is missing\./);
  assert.doesNotMatch(logged[2], /hash-secreto|base64|passwordHash/, "Prisma invocation values must not reach the log");

  logged.length = 0;
  const notFound = await request(testUrl, "/client-error");
  assert.equal(notFound.status, 404, "4xx errors passed to next() keep their status");
  assert.doesNotMatch(notFound.text, new RegExp(INTERNAL_ERROR_MESSAGE));
  assert.ok(!logged.some((line) => line.startsWith("[api] Error interno")));
  logged.length = 0;
  await assert.rejects(request(testUrl, "/after-headers"));
  assert.equal(logged.filter((line) => line.startsWith("[api] Error interno")).length, 1, "An error after headers were sent is logged once and the connection is closed");
  console.log("PASS 7b: sync/async/Prisma exceptions never expose their message; Prisma invocation data is excluded from logs; 4xx errors are delegated unchanged");
} finally {
  await new Promise((resolve) => testServer.close(resolve));
  console.error = originalConsoleError;
}
