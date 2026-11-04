export const LOGIN_LIMITS = {
  windowMs: 15 * 60 * 1000,
  maxPerIpAccount: 5,
  maxPerAccount: 20,
  maxPerIp: 50,
  trustedIpTtlMs: 7 * 24 * 60 * 60 * 1000,
  maxEntries: 10000,
};

const normalizeAccount = (account) => String(account ?? "").trim().toLowerCase();
const normalizeIp = (ip) => String(ip || "unknown");

// Ventanas fijas en memoria: cada bloqueo expira solo, nunca es permanente.
export const createLoginLimiter = ({ now = Date.now, ...overrides } = {}) => {
  const limits = { ...LOGIN_LIMITS, ...overrides };
  const buckets = new Map();
  const trustedIps = new Map();

  const live = (store, key, time) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (time >= entry.resetAt) {
      store.delete(key);
      return null;
    }
    return entry;
  };

  const prune = (store, time) => {
    if (store.size < limits.maxEntries) return;
    for (const [key, entry] of store) if (time >= entry.resetAt) store.delete(key);
    for (const key of store.keys()) {
      if (store.size < limits.maxEntries) break;
      store.delete(key);
    }
  };

  const keysFor = (ip, account, time) => {
    const ipKey = normalizeIp(ip);
    const accountKey = normalizeAccount(account);
    const pair = `${ipKey}|${accountKey}`;
    const keys = [[`pair:${pair}`, limits.maxPerIpAccount], [`ip:${ipKey}`, limits.maxPerIp]];
    // Una IP con login exitoso reciente en la cuenta no queda bloqueada por ataques distribuidos contra esa cuenta.
    if (!live(trustedIps, pair, time)) keys.push([`account:${accountKey}`, limits.maxPerAccount]);
    return { pair, keys };
  };

  return {
    begin(ip, account) {
      const time = now();
      const { keys } = keysFor(ip, account, time);
      const retryAfterMs = Math.max(0, ...keys.map(([key, max]) => {
        const entry = live(buckets, key, time);
        return entry && entry.count >= max ? entry.resetAt - time : 0;
      }));
      if (retryAfterMs > 0) return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
      prune(buckets, time);
      // El intento se cuenta antes de verificar la contraseña para que las ráfagas concurrentes no superen el límite.
      for (const [key] of keys) {
        const entry = live(buckets, key, time);
        if (entry) entry.count += 1;
        else buckets.set(key, { count: 1, resetAt: time + limits.windowMs });
      }
      return { allowed: true };
    },
    succeed(ip, account) {
      const time = now();
      const ipKey = normalizeIp(ip);
      const accountKey = normalizeAccount(account);
      const pair = `${ipKey}|${accountKey}`;
      buckets.delete(`pair:${pair}`);
      buckets.delete(`account:${accountKey}`);
      const ipEntry = live(buckets, `ip:${ipKey}`, time);
      if (ipEntry && --ipEntry.count <= 0) buckets.delete(`ip:${ipKey}`);
      prune(trustedIps, time);
      trustedIps.set(pair, { resetAt: time + limits.trustedIpTtlMs });
    },
    reset() {
      buckets.clear();
      trustedIps.clear();
    },
    size: () => buckets.size + trustedIps.size,
  };
};

export const loginLimiter = createLoginLimiter();

export const createLoginRateLimit = (limiter = loginLimiter) => (req, res, next) => {
  const ip = req.ip;
  const account = req.body?.identifier;
  const attempt = limiter.begin(ip, account);
  if (!attempt.allowed) {
    res.set("Retry-After", String(attempt.retryAfterSeconds));
    return res.status(429).json({ message: `Demasiados intentos de inicio de sesión. Intenta nuevamente en ${Math.ceil(attempt.retryAfterSeconds / 60)} minuto(s).` });
  }
  res.on("finish", () => {
    if (res.statusCode === 200) limiter.succeed(ip, account);
  });
  return next();
};

export const loginRateLimit = createLoginRateLimit();
