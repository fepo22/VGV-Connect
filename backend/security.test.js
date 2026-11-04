import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import openApiDocument from "./docs/openapi.js";

const secret = randomBytes(32).toString("hex");
const backend = fileURLToPath(new URL(".", import.meta.url));

async function loadModule(path, env, dependencies = {}) {
  const context = createContext({
    process: { env },
    Buffer,
    console: { log() {} },
  });
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

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function runStartup(jwtSecret) {
  const env = {
    ...process.env,
    NODE_ENV: "test",
    ENABLE_DEMO_USERS: "false",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:1/security_test",
    DOTENV_CONFIG_PATH: join(tmpdir(), `vgv-no-env-${randomUUID()}`),
  };
  if (jwtSecret === undefined) delete env.JWT_SECRET;
  else env.JWT_SECRET = jwtSecret;
  // Exercise the real startup imports without opening a listening socket.
  return spawnSync(process.execPath, ["--input-type=module", "-e", `
    const { default: app } = await import("./src/app.js");
    app.listen = () => console.log("startup accepted");
    await import("./src/server.js");
  `], { cwd: backend, env, encoding: "utf8", timeout: 60000 });
}

for (const value of [undefined, "", "x".repeat(31), "\u00e9".repeat(15)]) {
  const result = runStartup(value);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET es obligatorio/);
  assert.ok(!result.stdout.includes("startup accepted"));
}
for (const value of ["x".repeat(32), "\u00e9".repeat(16), secret]) {
  const result = runStartup(value);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, "Valid JWT_SECRET must permit startup");
  assert.match(result.stdout, /startup accepted/);
}
console.log("PASS 1-3: startup rejects missing or <32 UTF-8 bytes; accepts valid secrets");

const auth = await loadModule("./middleware/auth.middleware.js", { JWT_SECRET: secret }, {
  "dotenv/config": {},
  jsonwebtoken: { default: jwt },
});
const user = { id: 7, name: "Test", role: "driver" };
const token = auth.signUserToken(user);
const decoded = jwt.decode(token, { complete: true });
assert.equal(decoded.header.alg, "HS256");
assert.equal(decoded.payload.exp - decoded.payload.iat, 8 * 60 * 60);
let nextCalls = 0;
const req = { headers: { authorization: `Bearer ${token}` } };
auth.requireAuth(req, response(), () => nextCalls++);
assert.equal(nextCalls, 1);
assert.equal(req.user.sub, user.id);
const invalidTokens = [
  jwt.sign({ sub: user.id }, secret, { algorithm: "HS384" }),
  jwt.sign({ sub: user.id }, secret, { algorithm: "HS512" }),
  jwt.sign({ sub: user.id }, null, { algorithm: "none" }),
  jwt.sign({ sub: user.id }, secret, { algorithm: "HS256", expiresIn: -1 }),
  jwt.sign({ sub: user.id }, randomBytes(32), { algorithm: "HS256" }),
  "malformed",
];
for (const invalidToken of invalidTokens) {
  const res = response();
  auth.requireAuth({ headers: { authorization: `Bearer ${invalidToken}` } }, res, () => {
    assert.fail("Invalid token was accepted");
  });
  assert.equal(res.statusCode, 401);
}
console.log("PASS 4: signs HS256 only; rejects HS384, HS512, unsigned, expired and invalid tokens");

for (const env of [
  {},
  { ENABLE_DEMO_USERS: "true", NODE_ENV: "development" },
  { ENABLE_DEMO_USERS: "true", NODE_ENV: "production" },
]) {
  let lookups = 0;
  const controller = await loadModule("./controllers/auth.controller.js", env, {
    bcryptjs: { default: bcrypt },
    "../prismaClient.js": { default: { user: { async findFirst() { lookups++; return null; } } } },
    "../services/audit.service.js": { logAudit: () => assert.fail("Unexpected audit write") },
    "../middleware/auth.middleware.js": { signUserToken: () => assert.fail("Unexpected token") },
  });
  const res = response();
  await controller.login({ body: { identifier: "missing", password: "invalid" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(lookups, 1);
}
console.log("PASS 5: login on an empty user store never bootstraps demo users");

async function demoService(env, existingUsers = 0) {
  const calls = { count: 0, created: [] };
  const service = await loadModule("./services/bootstrap-users.service.js", env, {
    bcryptjs: { default: bcrypt },
    "../prismaClient.js": {
      default: { user: {
        async count() { calls.count++; return existingUsers; },
        async create({ data }) { calls.created.push(data); },
      } },
    },
  });
  await service.ensureDemoUsers();
  await service.ensureDemoUsers();
  return calls;
}

for (const env of [
  {},
  { NODE_ENV: "development" },
  { NODE_ENV: "development", ENABLE_DEMO_USERS: "false" },
  { NODE_ENV: "development", ENABLE_DEMO_USERS: "TRUE" },
  { NODE_ENV: "production", ENABLE_DEMO_USERS: "true" },
]) {
  const calls = await demoService(env);
  assert.equal(calls.count, 0);
  assert.equal(calls.created.length, 0);
}
const enabled = await demoService({ NODE_ENV: "development", ENABLE_DEMO_USERS: "true" });
assert.equal(enabled.count, 1);
assert.equal(enabled.created.length, 10);
assert.ok(enabled.created.every((record) => /^\$2[aby]\$10\$/.test(record.passwordHash)));
const existing = await demoService({ NODE_ENV: "development", ENABLE_DEMO_USERS: "true" }, 1);
assert.equal(existing.created.length, 0);

let bootstrapped = false;
let listening = false;
await loadModule("./src/server.js", {}, {
  "./app.js": { default: { listen() { assert.ok(bootstrapped); listening = true; } } },
  dotenv: { default: { config() {} } },
  "../services/bootstrap-users.service.js": {
    async ensureDemoUsers() { bootstrapped = true; },
  },
});
assert.ok(listening);
console.log("PASS 6: demos require exact opt-in outside production, only on empty stores, at startup");

async function runSeed(existingUsers) {
  let finish;
  const finished = new Promise((resolve) => { finish = resolve; });
  const calls = { users: 0, vehicles: 0 };
  class PrismaMock {
    user = {
      async upsert({ where, update, create }) {
        calls.users++;
        if (existingUsers) {
          const before = { username: where.username, name: "Preserved", role: "driver", passwordHash: "existing-hash" };
          const after = { ...before, ...update };
          assert.equal(JSON.stringify(after), JSON.stringify(before));
          assert.equal(Object.keys(update).length, 0);
          return after;
        }
        assert.ok(create.passwordHash);
        return create;
      },
    };
    vehicle = { async upsert() { calls.vehicles++; } };
    async $disconnect() { finish(); }
  }
  await loadModule("./prisma/seed.js", { NODE_ENV: "development" }, {
    bcryptjs: { default: { async hash() { return "new-test-hash"; } } },
    "@prisma/client": { PrismaClient: PrismaMock },
    dotenv: { default: { config() {} } },
  });
  await finished;
  assert.equal(calls.users, 3);
  assert.equal(calls.vehicles, 7);
}
await runSeed(true);
await runSeed(false);
console.log("PASS 7: seed preserves existing hashes, names and roles; still creates missing users");

await assert.rejects(loadModule("./prisma/seed.js", { NODE_ENV: "production" }, {
  bcryptjs: { default: bcrypt },
  "@prisma/client": { PrismaClient: class { constructor() { assert.fail("Prisma instantiated in production"); } } },
  dotenv: { default: { config() {} } },
}), /El seed no se puede ejecutar en produccion/);
console.log("PASS 8: seed refuses production before creating a database client");

const loginProperties = openApiDocument.components.schemas.LoginRequest.properties;
assert.ok(!Object.hasOwn(loginProperties.identifier, "example"));
assert.ok(!Object.hasOwn(loginProperties.password, "example"));
assert.equal(loginProperties.password.format, "password");
console.log("PASS 9: public OpenAPI login schema contains no default credentials");
