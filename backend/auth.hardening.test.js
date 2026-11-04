import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import bcrypt from "bcryptjs";
import express from "express";
import * as passwordPolicy from "./services/password-policy.service.js";
import { createLoginLimiter, createLoginRateLimit, LOGIN_LIMITS } from "./middleware/login-rate-limit.middleware.js";

async function loadModule(path, dependencies) {
  const context = createContext({ console: { log() {} } });
  const module = new SourceTextModule(await readFile(new URL(path, import.meta.url), "utf8"), { context });
  await module.link((specifier) => {
    assert.ok(Object.hasOwn(dependencies, specifier), `Unmocked dependency: ${specifier}`);
    const exports = dependencies[specifier];
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const { validateNewPassword } = passwordPolicy;

// 1. Política de contraseñas nuevas
for (const weak of ["1234", "4821", "abc", "12345678", "11111111", "abcdefgh", "admin123", "Password", "aaaabbbb", "juan2025xy", "perez-9174k", "a".repeat(73)]) {
  assert.ok(validateNewPassword(weak, { username: "juan", name: "Pedro Perez" }), `Weak password accepted: ${weak}`);
}
for (const strong of ["Tr4nsp0rte!", "k7m2p9x4qh", "48201937", "camion azul norte"]) {
  assert.equal(validateNewPassword(strong, { username: "juan", name: "Pedro Perez" }), null, `Strong password rejected: ${strong}`);
}
// B6: el servidor ya no genera claves; las define el administrador.
assert.equal(passwordPolicy.generateTemporaryPassword, undefined);
console.log("PASS 1: rejects weak new passwords/PINs; the server no longer generates temporary passwords");

// 2. Controlador de conductores: creación y cambio de contraseña
const created = [];
const updated = [];
const driversController = await loadModule("./controllers/drivers.controller.js", {
  bcryptjs: { default: { hash: (value) => bcrypt.hash(value, 4) } },
  "../prismaClient.js": { default: {
    user: {
      async findFirst({ where }) { return typeof where.id === "number" ? { id: where.id, username: "jperez", name: "Juan Perez" } : null; },
      async create({ data }) { created.push(data); return { id: 50, username: data.username, name: data.name }; },
      async update({ data }) { updated.push(data); return { id: 50 }; },
    },
    vehicle: { async findUnique() { return null; } },
  } },
  "../services/audit.service.js": { logAudit: async () => {} },
  "../services/password-policy.service.js": passwordPolicy,
});
const response = () => ({ statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

let res;
for (const weak of ["1234", "4821", "12345678", "jperez2024", "perez-ruta-9", "aaaaaaaa"]) {
  res = response();
  await driversController.createDriver({ body: { name: "Juan Perez", username: "jperez", temporaryPassword: weak, temporaryPasswordConfirmation: weak }, user: { sub: 1 } }, res);
  assert.equal(res.statusCode, 400, `Weak temporary password accepted on create: ${weak}`);
}
res = response();
await driversController.createDriver({ body: { name: "Juan Perez", username: "jperez" }, user: { sub: 1 } }, res);
assert.equal(res.statusCode, 400, "Create without temporary password must not auto-generate one");
assert.equal(created.length, 0);
res = response();
await driversController.createDriver({ body: { name: "Juan Perez", username: "jperez", temporaryPassword: "Tr4nsp0rte!", temporaryPasswordConfirmation: "Tr4nsp0rte!" }, user: { sub: 1 } }, res);
assert.equal(res.statusCode, 201);
assert.ok(!JSON.stringify(res.body).includes("Tr4nsp0rte!") && !("temporaryPassword" in res.body) && !("passwordHash" in res.body));
assert.ok(await bcrypt.compare("Tr4nsp0rte!", created[0].passwordHash));
assert.ok(!Object.values(created[0]).includes("Tr4nsp0rte!"), "Plain password stored");
for (const body of [{ password: "Tr4nsp0rte!" }, { password: "1234" }, { name: "Otro Nombre", password: "Tr4nsp0rte!" }, { temporaryPassword: "Tr4nsp0rte!", temporaryPasswordConfirmation: "Tr4nsp0rte!" }]) {
  res = response();
  await driversController.updateDriver({ params: { id: "50" }, body, user: { sub: 1 } }, res);
  assert.equal(res.statusCode, 400, `Update accepted a password: ${Object.keys(body)}`);
  assert.ok(!JSON.stringify(res.body).includes("Tr4nsp0rte!"));
}
assert.equal(updated.length, 0, "Update with a password must not write anything");
res = response();
await driversController.updateDriver({ params: { id: "50" }, body: { name: "Otro Nombre", password: "" }, user: { sub: 1 } }, res);
assert.equal(res.statusCode, 200);
assert.equal(updated[0].passwordHash, undefined);
assert.equal(updated[0].mustChangePassword, undefined);
assert.equal(updated[0].passwordChangedAt, undefined);
console.log("PASS 2: driver credentials are admin-defined and policy compliant on create; only the hash is stored; general updates cannot set passwords and leave credentials untouched");

// 3. Login HTTP real con limitador y reloj falso
let clock = Date.parse("2026-11-04T12:00:00.000Z");
const limiter = createLoginLimiter({ now: () => clock });
const users = [
  { id: 1, username: "admin", name: "Admin", role: "admin", passwordHash: await bcrypt.hash("Adm1n-Segura!", 4) },
  { id: 2, username: "chofer", name: "Chofer", role: "driver", passwordHash: await bcrypt.hash("4821", 4) },
  { id: 3, username: "otro", name: "Otro", role: "driver", passwordHash: await bcrypt.hash("0tro-Segura!", 4) },
];
let compares = 0;
const authController = await loadModule("./controllers/auth.controller.js", {
  bcryptjs: { default: { hash: (value) => bcrypt.hash(value, 4), compare: (value, hash) => { compares++; return bcrypt.compare(value, hash); } } },
  "../prismaClient.js": { default: { user: { async findFirst({ where }) { return users.find((user) => user.username.toLowerCase() === where.username.equals.toLowerCase()) || null; } } } },
  "../services/audit.service.js": { logAudit: async () => {} },
  "../middleware/auth.middleware.js": { signUserToken: (user) => `token-${user.id}` },
});
const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.post("/auth/login", createLoginRateLimit(limiter), (req, res, next) => Promise.resolve(authController.login(req, res)).catch(next));
const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const login = async (identifier, password, ip = "10.0.0.1") => {
  const result = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ identifier, password }) });
  return { status: result.status, retryAfter: result.headers.get("retry-after"), body: await result.json() };
};

try {
  // Respuesta genérica y comparación bcrypt también con usuario inexistente
  compares = 0;
  const unknown = await login("no-existe", "x", "10.9.9.9");
  const wrong = await login("admin", "x", "10.9.9.8");
  assert.equal(unknown.status, 400);
  assert.deepEqual(unknown.body, wrong.body);
  assert.equal(compares, 2);
  console.log("PASS 3: invalid credentials return identical generic response and always run bcrypt");

  // Compatibilidad: usuario existente con contraseña antigua débil sigue entrando
  const legacy = await login("CHOFER", "4821", "10.9.9.7");
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.token, "token-2");
  console.log("PASS 4: existing users (including legacy weak passwords) still log in; no password is rewritten");

  limiter.reset();
  for (let i = 0; i < LOGIN_LIMITS.maxPerIpAccount; i++) assert.equal((await login("admin", "mala", "10.0.0.1")).status, 400);
  const blocked = await login("admin", "Adm1n-Segura!", "10.0.0.1");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.retryAfter) > 0 && Number(blocked.retryAfter) <= LOGIN_LIMITS.windowMs / 1000);
  assert.match(blocked.body.message, /Demasiados intentos/);
  assert.equal((await login("Admin ", "mala", "10.0.0.1")).status, 429, "Account normalization bypass");
  const blockedUnknown = await (async () => {
    for (let i = 0; i < LOGIN_LIMITS.maxPerIpAccount; i++) await login("fantasma", "mala", "10.0.0.2");
    return login("fantasma", "mala", "10.0.0.2");
  })();
  assert.equal(blockedUnknown.status, 429);
  assert.deepEqual(blockedUnknown.body.message.replace(/\d+/g, "N"), blocked.body.message.replace(/\d+/g, "N"));
  console.log("PASS 5: repeated failures per IP+account return 429 with Retry-After, even for the correct password or unknown users");

  assert.equal((await login("admin", "Adm1n-Segura!", "10.0.0.3")).status, 200, "Other IP was blocked for same account");
  assert.equal((await login("otro", "0tro-Segura!", "10.0.0.1")).status, 200, "Other account was blocked for same IP");
  console.log("PASS 6: IP+account lock does not affect other IPs or other accounts");

  clock += LOGIN_LIMITS.windowMs;
  assert.equal((await login("admin", "mala", "10.0.0.1")).status, 400);
  assert.equal((await login("admin", "Adm1n-Segura!", "10.0.0.1")).status, 200);
  for (let i = 0; i < LOGIN_LIMITS.maxPerIpAccount; i++) assert.equal((await login("admin", "mala", "10.0.0.1")).status, 400, "Success did not reset counter");
  console.log("PASS 7: lock expires after the window; correct login succeeds and resets the counter");

  limiter.reset();
  for (let i = 0; i < LOGIN_LIMITS.maxPerAccount; i++) assert.equal((await login("chofer", "mala", `10.1.0.${i}`)).status, 400);
  assert.equal((await login("chofer", "4821", "10.1.9.9")).status, 429, "Distributed attack on account not limited");
  console.log("PASS 8: per-account limit stops distributed guessing from many IPs");

  limiter.reset();
  assert.equal((await login("chofer", "4821", "10.2.0.1")).status, 200);
  for (let i = 0; i < LOGIN_LIMITS.maxPerAccount; i++) await login("chofer", "mala", `10.3.0.${i}`);
  assert.equal((await login("chofer", "4821", "10.3.9.9")).status, 429);
  assert.equal((await login("chofer", "4821", "10.2.0.1")).status, 200, "Legitimate device locked out by attacker");
  console.log("PASS 9: recently successful IP keeps access while account is under distributed attack (anti-DoS)");

  limiter.reset();
  for (let i = 0; i < LOGIN_LIMITS.maxPerIp; i++) await login(`user${i}`, "mala", "10.4.0.1");
  assert.equal((await login("admin", "Adm1n-Segura!", "10.4.0.1")).status, 429, "Per-IP spraying not limited");
  assert.equal((await login("admin", "Adm1n-Segura!", "10.4.0.2")).status, 200);
  console.log("PASS 10: per-IP limit stops password spraying across accounts without affecting other IPs");

  limiter.reset();
  compares = 0;
  const burst = await Promise.all(Array.from({ length: 20 }, () => login("admin", "mala", "10.5.0.1")));
  assert.equal(burst.filter((result) => result.status === 400).length, LOGIN_LIMITS.maxPerIpAccount);
  assert.equal(burst.filter((result) => result.status === 429).length, 20 - LOGIN_LIMITS.maxPerIpAccount);
  assert.equal(compares, LOGIN_LIMITS.maxPerIpAccount);
  console.log("PASS 11: parallel burst cannot exceed the limit; blocked requests never reach bcrypt");
} finally {
  server.close();
}

// 4. Memoria acotada
const small = createLoginLimiter({ now: () => clock, maxEntries: 50 });
for (let i = 0; i < 1000; i++) small.begin(`10.6.${Math.floor(i / 250)}.${i % 250}`, `cuenta${i}`);
assert.ok(small.begin("10.7.0.1", "nueva").allowed);
assert.ok(small.size() <= 50 + 3, `Limiter grew to ${small.size()} entries`);
console.log("PASS 12: limiter memory stays bounded under many distinct keys");
