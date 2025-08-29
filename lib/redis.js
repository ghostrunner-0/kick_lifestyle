// lib/redis.js
import Redis from "ioredis";

let client = global.__redis__;
if (!client && process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
  });
  client.on("error", (e) => console.error("[redis] error:", e.message));
  global.__redis__ = client;
}

export const redis = client || null;

// Simple KV with JSON
export const kv = {
  async get(key) {
    if (!redis) return null;
    const v = await redis.get(key);
    try {
      return v ? JSON.parse(v) : null;
    } catch {
      return v;
    }
  },
  async set(key, value, ttlSec) {
    if (!redis) return false;
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    return ttlSec
      ? redis.set(key, payload, "EX", ttlSec)
      : redis.set(key, payload);
  },
  async del(key) {
    if (!redis) return 0;
    return redis.del(key);
  },
};

// Read-through cache
export const cache = {
  /**
   * with(key, ttlSeconds, computeFn)
   * Tries Redis; on miss runs computeFn(), stores JSON in Redis, returns value.
   * If Redis is unavailable, just runs computeFn().
   */
  async with(key, ttl, fn) {
    if (!redis) return fn();

    try {
      const hit = await redis.get(key);
      if (hit != null) {
        try {
          return JSON.parse(hit);
        } catch {
          return hit;
        }
      }
    } catch {
      // read error → fall back to compute
      return fn();
    }

    const value = await fn();

    // best-effort set
    try {
      const payload = typeof value === "string" ? value : JSON.stringify(value);
      if (ttl) await redis.set(key, payload, "EX", ttl);
      else await redis.set(key, payload);
    } catch {
      // swallow write errors
    }

    return value;
  },
};
