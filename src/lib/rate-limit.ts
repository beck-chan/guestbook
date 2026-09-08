import { createHash } from "node:crypto";
import { Pool } from "pg";
import { RateLimiterPostgres, type RateLimiterRes } from "rate-limiter-flexible";
import type { GuestbookSettings } from "@/lib/guestbookSettingsShared";
import { guestbookRateLimits } from "@/lib/guestbookSettingsShared";

type RateLimits = ReturnType<typeof guestbookRateLimits>;

let pool: Pool | null = null;
let tableReady = false;
const limiterCache = new Map<string, RateLimiterPostgres>();

function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the Supabase pooler URI to .env.local (and Vercel).",
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString)
        ? undefined
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Duck-typed store for rate-limiter-flexible.
 * Supabase Transaction pooler (6543) rejects named prepared statements, so we
 * never forward `name` to `pg`.
 */
function getStoreClient() {
  const pgPool = getPool();
  return {
    query(config: { name?: string; text: string; values?: unknown[] }) {
      return pgPool.query({
        text: config.text,
        values: config.values,
      });
    },
  };
}

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function hasRoom(res: RateLimiterRes | null) {
  return res === null || res.remainingPoints > 0;
}

function waitMinutes(msBeforeNext: number) {
  return Math.max(1, Math.ceil(msBeforeNext / 60_000));
}

function rateLimitMessage(limits: RateLimits, msBeforeNext: number) {
  const wait = waitMinutes(msBeforeNext);
  return `You can post ${limits.count} message(s) every ${limits.minutes} minutes and at most ${limits.daily} messages every 24 hours. Please wait about ${wait} minute${wait === 1 ? "" : "s"}.`;
}

function isRateLimiterRes(err: unknown): err is RateLimiterRes {
  return (
    typeof err === "object" &&
    err !== null &&
    "msBeforeNext" in err &&
    typeof (err as RateLimiterRes).msBeforeNext === "number"
  );
}

async function getLimiter(opts: {
  points: number;
  duration: number;
  keyPrefix: string;
}) {
  const cached = limiterCache.get(opts.keyPrefix);
  if (cached) {
    return cached;
  }

  const storeClient = getStoreClient();
  // Ready callback can run synchronously while `new` is still evaluating.
  // Defer resolve so we never read the instance in the TDZ / pre-assign window.
  const limiter = await new Promise<RateLimiterPostgres>((resolve, reject) => {
    let settled = false;
    let instance!: RateLimiterPostgres;

    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      if (err) {
        reject(err);
        return;
      }
      tableReady = true;
      queueMicrotask(() => resolve(instance));
    };

    try {
      instance = new RateLimiterPostgres(
        {
          storeClient,
          // Treat duck-typed client like a pool (acquire = identity, no release).
          storeType: "pool",
          points: opts.points,
          duration: opts.duration,
          keyPrefix: opts.keyPrefix,
          tableName: "guestbook_rate_limits",
          tableCreated: tableReady,
        },
        (err) => finish(err ?? undefined),
      );
    } catch (err) {
      finish(err);
    }
  });

  limiterCache.set(opts.keyPrefix, limiter);
  return limiter;
}

/**
 * Check both windows with get(); consume only when both have room so a
 * failed check does not leave a dangling consume on the other window.
 */
export async function consumeCommentRateLimit(
  ip: string,
  settings: GuestbookSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const limits = guestbookRateLimits(settings);
  const key = hashIp(ip || "unknown");

  // Include window params in keyPrefix so admin setting changes start fresh buckets.
  const burst = await getLimiter({
    points: limits.count,
    duration: limits.minutes * 60,
    keyPrefix: `gb_burst_${limits.count}_${limits.minutes}m`,
  });
  const daily = await getLimiter({
    points: limits.daily,
    duration: 86_400,
    keyPrefix: `gb_daily_${limits.daily}`,
  });

  const [dailyRes, burstRes] = await Promise.all([
    daily.get(key),
    burst.get(key),
  ]);

  if (!hasRoom(dailyRes) || !hasRoom(burstRes)) {
    const ms = Math.max(
      !hasRoom(dailyRes) ? (dailyRes?.msBeforeNext ?? 0) : 0,
      !hasRoom(burstRes) ? (burstRes?.msBeforeNext ?? 0) : 0,
    );
    return { ok: false, error: rateLimitMessage(limits, ms) };
  }

  try {
    await daily.consume(key);
    await burst.consume(key);
  } catch (err) {
    if (isRateLimiterRes(err)) {
      return { ok: false, error: rateLimitMessage(limits, err.msBeforeNext) };
    }
    throw err;
  }

  return { ok: true };
}
