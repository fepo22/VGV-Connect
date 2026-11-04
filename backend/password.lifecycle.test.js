import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import * as passwordPolicy from "./services/password-policy.service.js";
import * as loginRateLimit from "./middleware/login-rate-limit.middleware.js";
import openApiDocument from "./docs/openapi.js";

const secret = randomBytes(32).toString("hex");

async function loadModule(path, dependencies, env = {}) {
  const context = createContext({ process: { env }, Buffer, console: { log() {} } });
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
}

// Prisma en memoria con proyección de select, para detectar fugas de campos sensibles.
const hash = (value) => bcrypt.hash(value, 4);
const users = new Map();
let nextId = 100;
const addUser = async (id, username, name, role, password, extra = {}) => users.set(id, { id, username, name, role, passwordHash: await hash(password), mustChangePassword: false, passwordChangedAt: null, defaultVehicleId: null, ...extra });
await addUser(1, "admin", "Admin Central", "admin", "Adm1n-Segura!");
await addUser(2, "planner", "Plani Ficador", "route_planner", "Plan-Segura-77");
await addUser(3, "billing", "Factu Racion", "billing", "Fact-Segura-88");
await addUser(7, "chofer.a", "Conductor Alfa", "driver", "4821");
await addUser(8, "chofer.b", "Conductor Beta", "driver", "Beta-Segura-99");

const project = (user, select) => {
  if (!user) return null;
  const copy = structuredClone(user);
  if (!select) return copy;
  return Object.fromEntries(Object.keys(select).filter((key) => select[key] && key in copy).map((key) => [key, copy[key]]));
};
const matches = (user, where) => Object.entries(where).every(([key, condition]) => {
  if (condition && typeof condition === "object" && "equals" in condition) return String(user[key]).toLowerCase() === String(condition.equals).toLowerCase();
  if (condition && typeof condition === "object" && "not" in condition) return user[key] !== condition.not;
  return user[key] === condition;
});
const audit = [];
const prisma = {
  user: {
    async findUnique({ where, select }) { return project(users.get(where.id), select); },
    async findFirst({ where, select }) { return project([...users.values()].find((user) => matches(user, where)), select); },
    async update({ where, data, select }) {
      const user = users.get(where.id);
      if (!user) throw Object.assign(new Error("not found"), { code: "P2025" });
      Object.assign(user, structuredClone(data));
      return project(user, select);
    },
    async create({ data, select }) {
      const user = { id: nextId++, mustChangePassword: false, passwordChangedAt: null, defaultVehicleId: null, ...structuredClone(data) };
      users.set(user.id, user);
      return project(user, select);
    },
    async delete({ where }) { users.delete(where.id); },
  },
  vehicle: { async findUnique() { return null; } },
};

const env = { JWT_SECRET: secret };
const shared = {
  bcryptjs: { default: { hash, compare: bcrypt.compare } },
  "../prismaClient.js": { default: prisma },
  "../services/audit.service.js": { logAudit: async (entry) => { audit.push(entry); } },
  "../services/password-policy.service.js": passwordPolicy,
  "../middleware/login-rate-limit.middleware.js": loginRateLimit,
};
const authMiddleware = await loadModule("./middleware/auth.middleware.js", { "dotenv/config": {}, jsonwebtoken: { default: jwt } }, env);
const sessionMiddleware = await loadModule("./middleware/session.middleware.js", { "../prismaClient.js": shared["../prismaClient.js"], "./auth.middleware.js": authMiddleware });
const withAuth = { ...shared, "../middleware/auth.middleware.js": authMiddleware, "../middleware/session.middleware.js": sessionMiddleware, express: { Router: express.Router } };
const authController = await loadModule("./controllers/auth.controller.js", withAuth);
const passwordController = await loadModule("./controllers/password.controller.js", withAuth);
const driversController = await loadModule("./controllers/drivers.controller.js", withAuth);
const stubs = (...names) => Object.fromEntries(names.map((name) => [name, (req, res) => res.json({ ok: true, handler: name, user: req.user.sub })]));
const routers = {
  "/auth": await loadModule("./routes/auth.routes.js", { ...withAuth, "../controllers/auth.controller.js": authController, "../controllers/password.controller.js": passwordController }),
  "/drivers": await loadModule("./routes/drivers.routes.js", { ...withAuth, "../controllers/drivers.controller.js": { ...driversController, ...stubs("getDrivers", "getDriversOverview") } }),
  "/routes": await loadModule("./routes/routes.routes.js", { ...withAuth, "../controllers/routes.controller.js": stubs("createRoute", "getRoutes", "getRoute", "optimizeRoute", "deleteRoute", "updateRoute") }),
  "/deliveries": await loadModule("./routes/deliveries.routes.js", { ...withAuth, "../controllers/deliveries.controller.js": stubs("getDeliveries", "updateDeliveryStatus", "uploadDeliveryPhoto"), "../controllers/audit.controller.js": stubs("getDriverAuditLogs") }),
  "/vehicle-checks": await loadModule("./routes/vehicle-checks.routes.js", { ...withAuth, "../controllers/vehicle-checks.controller.js": stubs("getVehicleChecks", "saveVehicleCheck") }),
  "/audit": await loadModule("./routes/audit.routes.js", { ...withAuth, "../controllers/audit.controller.js": stubs("getAuditLogs") }),
};
const app = express();
app.set("trust proxy", true);
app.use(express.json());
for (const [path, router] of Object.entries(routers)) app.use(path, router.default);
const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
let ipCounter = 0;
const call = async (method, path, { token, body, ip = `10.50.0.${++ipCounter % 250}` } = {}) => {
  const headers = { "content-type": "application/json", "x-forwarded-for": ip };
  if (token) headers.authorization = `Bearer ${token}`;
  const result = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await result.text();
  return { status: result.status, text, body: text ? JSON.parse(text) : null, retryAfter: result.headers.get("retry-after") };
};
const login = async (identifier, password) => call("POST", "/auth/login", { body: { identifier, password } });
const tokenFor = async (identifier, password) => {
  const result = await login(identifier, password);
  assert.equal(result.status, 200, `login ${identifier}`);
  return result.body.token;
};
const assertNoSecrets = (result) => {
  assert.doesNotMatch(result.text, /passwordHash|\$2[aby]\$/, "Response leaks a password hash");
};
const provisional = (password) => ({ temporaryPassword: password, temporaryPasswordConfirmation: password });
const assertNoPasswordEcho = (result, body) => {
  assertNoSecrets(result);
  for (const value of [body?.temporaryPassword, body?.temporaryPasswordConfirmation]) {
    if (typeof value === "string" && value.length >= 4) assert.ok(!result.text.includes(value), "Error response echoes the submitted password");
  }
};
const businessEndpoints = [["GET", "/routes"], ["GET", "/deliveries"], ["GET", "/vehicle-checks"], ["GET", "/deliveries/history"]];
// Captura de logs del backend durante el flujo para verificar que no se registren credenciales.
const capturedLogs = [];
const originalConsole = Object.fromEntries(["log", "info", "warn", "error", "debug"].map((level) => [level, console[level]]));
for (const level of Object.keys(originalConsole)) {
  console[level] = (...args) => {
    capturedLogs.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    originalConsole[level](...args);
  };
}

try {
  // Compatibilidad: tokens existentes (sin pwv) siguen válidos mientras no haya cambio de contraseña.
  const legacyAdminToken = jwt.sign({ sub: 1, name: "Admin Central", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "8h" });
  assert.equal((await call("GET", "/routes", { token: legacyAdminToken })).status, 200);
  const adminToken = await tokenFor("admin", "Adm1n-Segura!");
  const plannerToken = await tokenFor("planner", "Plan-Segura-77");
  const billingToken = await tokenFor("billing", "Fact-Segura-88");
  const driverBToken = await tokenFor("chofer.b", "Beta-Segura-99");
  const legacyLogin = await login("chofer.a", "4821");
  assert.equal(legacyLogin.body.user.mustChangePassword, false);
  const driverAToken = legacyLogin.body.token;
  const driverASecondDevice = await tokenFor("chofer.a", "4821");
  console.log("PASS 0: existing users and pre-B6 tokens keep working; nothing is forced or rewritten on deploy");

  // 1. Cambio correcto
  const changed = await call("POST", "/auth/change-password", { token: driverAToken, body: { currentPassword: "4821", newPassword: "Camion-Norte-58" } });
  assert.equal(changed.status, 200);
  assertNoSecrets(changed);
  assert.deepEqual(Object.keys(changed.body.user).sort(), ["id", "mustChangePassword", "name", "role", "username"]);
  assert.equal(changed.body.user.mustChangePassword, false);
  assert.ok(await bcrypt.compare("Camion-Norte-58", users.get(7).passwordHash));
  assert.ok(users.get(7).passwordChangedAt instanceof Date);
  assert.equal((await login("chofer.a", "4821")).status, 400);
  const driverANewToken = await tokenFor("chofer.a", "Camion-Norte-58");
  assert.ok(audit.some((entry) => entry.action === "password_changed" && entry.entityId === 7 && !("metadata" in entry)));
  console.log("PASS 1: user changes own password; new hash stored, old password rejected, no hash in response or audit");

  // 6. JWT anteriores invalidados (mismo dispositivo y otros dispositivos)
  for (const token of [driverAToken, driverASecondDevice]) {
    const revoked = await call("GET", "/routes", { token });
    assert.equal(revoked.status, 401);
    assert.match(revoked.body.message, /Sesión revocada/);
    assert.equal((await call("POST", "/auth/change-password", { token, body: { currentPassword: "Camion-Norte-58", newPassword: "Otra-Clave-123" } })).status, 401);
  }
  assert.equal((await call("GET", "/routes", { token: changed.body.token })).status, 200);
  assert.equal((await call("GET", "/routes", { token: driverANewToken })).status, 200);
  console.log("PASS 6: every token issued before the change is revoked; the token returned by the change works");

  // 7. Otros usuarios conservan sus sesiones
  for (const token of [adminToken, plannerToken, billingToken, driverBToken, legacyAdminToken]) assert.equal((await call("GET", "/routes", { token })).status, 200);
  console.log("PASS 7: other users keep their sessions after someone changes a password");

  // 2. Contraseñas débiles
  const hashBefore = users.get(7).passwordHash;
  for (const newPassword of ["1234", "12345678", "aaaaaaaa", "admin123", "xchofer.a9z", "conductor-77k", "Camion-Norte-58", "a".repeat(73)]) {
    const weak = await call("POST", "/auth/change-password", { token: driverANewToken, body: { currentPassword: "Camion-Norte-58", newPassword } });
    assert.equal(weak.status, 400, `Weak password accepted: ${newPassword}`);
  }
  const wrongCurrent = await call("POST", "/auth/change-password", { token: driverANewToken, body: { currentPassword: "incorrecta", newPassword: "Valida-Clave-42" } });
  assert.equal(wrongCurrent.status, 400, "Wrong current password must not be 401 (B3 would log out)");
  assert.equal(users.get(7).passwordHash, hashBefore);
  assert.equal((await call("GET", "/routes", { token: driverANewToken })).status, 200);
  console.log("PASS 2: weak, reused, personal or oversized passwords and wrong current password are rejected with 400; session kept");

  // 3. No se puede cambiar la contraseña de otro usuario
  const otherHashes = [1, 2, 3, 7].map((id) => users.get(id).passwordHash);
  const spoofed = await call("POST", "/auth/change-password", { token: driverBToken, body: { userId: 7, id: 7, sub: 7, username: "chofer.a", identifier: "admin", currentPassword: "Beta-Segura-99", newPassword: "Ruta-Nueva-321" } });
  assert.equal(spoofed.status, 200);
  assert.equal(spoofed.body.user.id, 8);
  assert.deepEqual([1, 2, 3, 7].map((id) => users.get(id).passwordHash), otherHashes);
  const driverBNewToken = spoofed.body.token;
  for (const token of [driverBNewToken, plannerToken, billingToken]) {
    assert.equal((await call("POST", "/drivers/7/reset-password", { token, body: provisional("Provisoria-Ruta-61") })).status, 403);
    assert.equal((await call("POST", "/drivers", { token, body: { name: "Intruso", username: "intruso", ...provisional("Provisoria-Ruta-61") } })).status, 403);
  }
  assert.equal((await call("POST", "/drivers/2/reset-password", { token: adminToken, body: provisional("Provisoria-Ruta-61") })).status, 404, "Admin reset must be limited to drivers");
  assert.deepEqual([1, 2, 3, 7].map((id) => users.get(id).passwordHash), otherHashes);
  console.log("PASS 3: body identifiers are ignored; non-admins cannot reset others; admin cannot reset non-driver accounts");

  // 8. Renovación por admin y permisos del admin
  const driverBHashBefore = users.get(8).passwordHash;
  const driverBChangedAtBefore = users.get(8).passwordChangedAt;
  for (const body of [undefined, {}, provisional(""), { temporaryPassword: 12345678, temporaryPasswordConfirmation: 12345678 }, { temporaryPassword: "Provisoria-Ruta-61" }, { temporaryPassword: "Provisoria-Ruta-61", temporaryPasswordConfirmation: "Provisoria-Ruta-62" }, provisional("1234"), provisional("12345678"), provisional("chofer.b-2026"), provisional("beta-ruta-77")]) {
    const rejected = await call("POST", "/drivers/8/reset-password", { token: adminToken, body });
    assert.equal(rejected.status, 400, `Invalid reset accepted: ${JSON.stringify(body)}`);
    assertNoPasswordEcho(rejected, body);
  }
  assert.match((await call("POST", "/drivers/8/reset-password", { token: adminToken, body: { temporaryPassword: "Provisoria-Ruta-61", temporaryPasswordConfirmation: "Provisoria-Ruta-62" } })).body.message, /confirmación no coincide/);
  assert.equal(users.get(8).passwordHash, driverBHashBefore);
  assert.equal(users.get(8).passwordChangedAt, driverBChangedAtBefore);
  assert.equal(users.get(8).mustChangePassword, false);
  assert.equal((await call("GET", "/routes", { token: driverBNewToken })).status, 200, "Rejected reset must not revoke sessions");
  const temporaryPassword = "Provisoria-Ruta-61";
  const reset = await call("POST", "/drivers/8/reset-password", { token: adminToken, body: provisional(temporaryPassword) });
  assert.equal(reset.status, 200);
  assertNoSecrets(reset);
  assert.deepEqual(reset.body, { id: 8, username: "chofer.b", mustChangePassword: true });
  assert.ok(!reset.text.includes(temporaryPassword), "Reset response reveals the temporary password");
  assert.ok(!JSON.stringify(audit).includes(temporaryPassword), "Audit log reveals the temporary password");
  assert.ok(await bcrypt.compare(temporaryPassword, users.get(8).passwordHash));
  assert.equal(users.get(8).mustChangePassword, true);
  assert.equal((await call("GET", "/routes", { token: driverBNewToken })).status, 401, "Admin reset must revoke driver sessions");
  for (const [method, path] of [["GET", "/drivers"], ["GET", "/drivers/overview"], ["GET", "/audit"], ["GET", "/routes"], ["POST", "/routes"]]) {
    assert.equal((await call(method, path, { token: adminToken })).status, 200, `${method} ${path}`);
  }
  for (const [method, path, token, expected] of [["GET", "/audit", plannerToken, 403], ["POST", "/routes", billingToken, 403], ["GET", "/drivers/overview", plannerToken, 200], ["GET", "/drivers", driverANewToken, 403]]) {
    assert.equal((await call(method, path, { token })).status, expected, `${method} ${path}`);
  }
  console.log("PASS 8: admin renews a driver credential with an admin-defined, confirmed, policy-compliant password that is never returned (revokes sessions); invalid renewals change nothing; permissions unchanged");

  // 4. Cambio obligatorio bloquea módulos de negocio
  const forcedLogin = await login("chofer.b", temporaryPassword);
  assert.equal(forcedLogin.status, 200);
  assert.equal(forcedLogin.body.user.mustChangePassword, true);
  for (const [method, path] of businessEndpoints) {
    const blocked = await call(method, path, { token: forcedLogin.body.token });
    assert.equal(blocked.status, 403, `${method} ${path}`);
    assert.equal(blocked.body.code, "PASSWORD_CHANGE_REQUIRED");
  }
  const gammaPassword = "Norte-Inicial-482";
  const createdBefore = users.size;
  for (const body of [
    { name: "Conductor Gamma", username: "chofer.g" },
    { name: "Conductor Gamma", username: "chofer.g", temporaryPassword: gammaPassword },
    { name: "Conductor Gamma", username: "chofer.g", temporaryPassword: gammaPassword, temporaryPasswordConfirmation: "Norte-Inicial-483" },
    ...["1234", "12345678", "chofer.g-2026", "gamma-ruta-77", "admin123", "a".repeat(73)].map((weak) => ({ name: "Conductor Gamma", username: "chofer.g", ...provisional(weak) })),
  ]) {
    const rejected = await call("POST", "/drivers", { token: adminToken, body });
    assert.equal(rejected.status, 400, `Invalid create accepted: ${JSON.stringify({ ...body, name: undefined })}`);
    assertNoPasswordEcho(rejected, body);
  }
  assert.equal(users.size, createdBefore, "Rejected create must not create users");
  const created = await call("POST", "/drivers", { token: adminToken, body: { name: "Conductor Gamma", username: "chofer.g", ...provisional(gammaPassword) } });
  assert.equal(created.status, 201);
  assertNoSecrets(created);
  assert.ok(!created.text.includes(gammaPassword), "Create response reveals the temporary password");
  assert.ok(!("temporaryPassword" in created.body) && !("passwordHash" in created.body));
  assert.equal(created.body.mustChangePassword, true);
  const gamma = users.get(created.body.id);
  assert.equal(gamma.mustChangePassword, true);
  assert.ok(gamma.passwordChangedAt instanceof Date);
  assert.ok(await bcrypt.compare(gammaPassword, gamma.passwordHash));
  assert.ok(!Object.values(gamma).includes(gammaPassword), "Plain password stored");
  const gammaLogin = await login("chofer.g", gammaPassword);
  assert.equal(gammaLogin.body.user.mustChangePassword, true);
  assert.equal((await call("GET", "/routes", { token: gammaLogin.body.token })).status, 403);
  const gammaUnlocked = await call("POST", "/auth/change-password", { token: gammaLogin.body.token, body: { currentPassword: gammaPassword, newPassword: "Norte-Definitiva-913" } });
  assert.equal(gammaUnlocked.status, 200);
  assert.equal((await call("GET", "/routes", { token: gammaUnlocked.body.token })).status, 200);
  assert.equal((await call("GET", "/routes", { token: gammaLogin.body.token })).status, 401);
  // PUT /drivers/:id ya no es una vía para cambiar claves: se rechaza sin tocar credenciales, sesiones ni auditoría.
  const driverABefore = { ...users.get(7) };
  const auditBefore = audit.length;
  for (const body of [{ password: "Asignada-Admin-73" }, { name: "Conductor Alfa Editado", password: "Asignada-Admin-73" }, { temporaryPassword: "Asignada-Admin-73", temporaryPasswordConfirmation: "Asignada-Admin-73" }, { password: "1234" }]) {
    const viaUpdate = await call("PUT", "/drivers/7", { token: adminToken, body });
    assert.equal(viaUpdate.status, 400, `PUT accepted a password: ${Object.keys(body)}`);
    assert.match(viaUpdate.body.message, /renovación de clave/);
    assertNoPasswordEcho(viaUpdate, { temporaryPassword: body.password ?? body.temporaryPassword });
  }
  assert.deepEqual(users.get(7), driverABefore, "Rejected PUT must not modify the driver");
  assert.equal(audit.length, auditBefore, "Rejected PUT must not be audited as an update");
  assert.equal((await call("GET", "/routes", { token: driverANewToken })).status, 200, "Rejected PUT must not revoke sessions");
  for (const token of [plannerToken, billingToken, driverANewToken]) {
    assert.equal((await call("PUT", "/drivers/7", { token, body: { password: "Asignada-Admin-73" } })).status, 403);
  }
  const plainUpdate = await call("PUT", "/drivers/7", { token: adminToken, body: { name: "Conductor Alfa Editado", password: "" } });
  assert.equal(plainUpdate.status, 200);
  assertNoSecrets(plainUpdate);
  assert.equal(users.get(7).name, "Conductor Alfa Editado");
  assert.equal(users.get(7).passwordHash, driverABefore.passwordHash);
  assert.equal(users.get(7).passwordChangedAt, driverABefore.passwordChangedAt);
  assert.equal(users.get(7).mustChangePassword, driverABefore.mustChangePassword);
  assert.equal((await call("GET", "/routes", { token: driverANewToken })).status, 200, "Plain update must keep sessions");
  assert.equal(audit.at(-1).action, "driver_updated");
  console.log("PASS 4: admin-defined creation (confirmed, policy compliant, hash only, never returned) and renewals force a password change; business endpoints return 403 PASSWORD_CHANGE_REQUIRED until changed; PUT /drivers/:id rejects passwords and plain edits keep credentials and sessions");

  // 5. Acceso tras cambiarla
  const unlocked = await call("POST", "/auth/change-password", { token: forcedLogin.body.token, body: { currentPassword: temporaryPassword, newPassword: "Despacho-Final-654" } });
  assert.equal(unlocked.status, 200);
  assert.equal(unlocked.body.user.mustChangePassword, false);
  assert.equal(users.get(8).mustChangePassword, false);
  for (const [method, path] of businessEndpoints) assert.equal((await call(method, path, { token: unlocked.body.token })).status, 200, `${method} ${path}`);
  assert.equal((await call("GET", "/routes", { token: forcedLogin.body.token })).status, 401);
  console.log("PASS 5: after changing the password the user accesses business modules; the forced-change token is revoked");

  // 9. Compatibilidad B3/B5 y revocación por eliminación o rol alterado
  const plannerHash = users.get(2).passwordHash;
  for (let i = 0; i < loginRateLimit.LOGIN_LIMITS.maxPerIpAccount; i++) {
    assert.equal((await call("POST", "/auth/change-password", { token: plannerToken, ip: "10.60.0.1", body: { currentPassword: "mala", newPassword: "Plan-Nueva-901" } })).status, 400);
  }
  const limited = await call("POST", "/auth/change-password", { token: plannerToken, ip: "10.60.0.1", body: { currentPassword: "Plan-Segura-77", newPassword: "Plan-Nueva-901" } });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.retryAfter) > 0);
  assert.equal(users.get(2).passwordHash, plannerHash);
  assert.equal((await call("GET", "/routes", { token: plannerToken })).status, 200, "429 must not end the session");
  for (let i = 0; i < loginRateLimit.LOGIN_LIMITS.maxPerIpAccount; i++) await call("POST", "/auth/login", { ip: "10.61.0.1", body: { identifier: "billing", password: "mala" } });
  assert.equal((await call("POST", "/auth/login", { ip: "10.61.0.1", body: { identifier: "billing", password: "Fact-Segura-88" } })).status, 429);
  const forgedRole = jwt.sign({ sub: 8, name: "Conductor Beta", role: "admin", pwv: authMiddleware.passwordVersion(users.get(8).passwordChangedAt) }, secret, { algorithm: "HS256" });
  assert.equal((await call("GET", "/audit", { token: forgedRole })).status, 401);
  users.delete(3);
  assert.equal((await call("GET", "/routes", { token: billingToken })).status, 401);
  assert.equal((await call("GET", "/routes")).status, 401);
  console.log("PASS 9: B3 semantics kept (400/403/429 never 401 unless the session is invalid); B5 login and change-password limits active; deleted users and stale roles are revoked");
} finally {
  server.close();
  Object.assign(console, originalConsole);
}

const secretsUsed = ["Provisoria-Ruta-61", "Norte-Inicial-482", "Norte-Inicial-483", "Norte-Definitiva-913", "Asignada-Admin-73", "Despacho-Final-654", "Adm1n-Segura!", "Plan-Segura-77", "Beta-Segura-99"];
const sinks = JSON.stringify(audit) + "\n" + capturedLogs.join("\n");
for (const value of secretsUsed) assert.ok(!sinks.includes(value), "A password reached the audit log or console output");
assert.doesNotMatch(sinks, /passwordHash|\$2[aby]\$/, "A password hash reached the audit log or console output");
assert.ok(audit.some((entry) => /driver/i.test(JSON.stringify(entry))), "Driver operations must still be audited");
console.log("PASS 11: no password or hash reaches responses, audit entries or console output");

const loginResponse = openApiDocument.components.schemas.LoginResponse;
assert.ok(loginResponse.properties.user.properties.mustChangePassword);
assert.ok(openApiDocument.paths["/auth/change-password"]?.post);
assert.ok(openApiDocument.paths["/drivers/{id}/reset-password"]?.post);
const temporaryInput = openApiDocument.components.schemas.TemporaryPasswordInput;
assert.deepEqual([...temporaryInput.required].sort(), ["temporaryPassword", "temporaryPasswordConfirmation"]);
assert.ok(openApiDocument.paths["/drivers"]?.post, "POST /drivers must be documented");
assert.doesNotMatch(JSON.stringify(openApiDocument.paths["/drivers"].post.responses), /temporaryPassword|passwordHash/, "Create response must not document a password");
assert.doesNotMatch(JSON.stringify(openApiDocument), /"example"\s*:\s*"[^"]*(?:123|pass|clave)/i);
console.log("PASS 10 (contract): OpenAPI documents mustChangePassword and the new endpoints without example credentials");
