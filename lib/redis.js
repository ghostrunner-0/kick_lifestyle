import Redis from "ioredis";

/**
 * Create a single Redis client for the whole app (safe across Next.js HMR)
 * Supports REDIS_URL or {host,port,password}
 */
const makeClient = () => {
  const url = process.env.REDIS_URL;
  if (url && url.length > 0) {
    return new Redis(url, {
      // robust defaults
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
};

// reuse between hot reloads
let _redis = global._redis;
if (!_redis) {
  _redis = makeClient();
  global._redis = _redis;
}

/** Export the low-level client (use when you need raw Redis commands) */
export const redis = _redis;

/** Small JSON helpers */
export const cache = {
  async get(key) {
    const raw = await redis.get(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  },
  async set(key, value, ttlSec) {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSec && Number(ttlSec) > 0) {
      await redis.set(key, str, "EX", Number(ttlSec));
    } else {
      await redis.set(key, str);
    }
  },
  async del(key) {
    await redis.del(key);
  },
  /** Read-through cache wrapper */
  async with(key, ttlSec, loaderFn) {
    const hit = await this.get(key);
    if (hit !== null) return hit;
    const data = await loaderFn();
    await this.set(key, data, ttlSec);
    return data;
  },
};

export async function redisPing() {
  try {
    // connect lazily on first command
    await redis.connect().catch(() => {});
    return await redis.ping();
  } catch (e) {
    return null;
  }
}
