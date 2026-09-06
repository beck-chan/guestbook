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
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: connectionString.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function hasRoom(res: RateLimiterRes | null) {
  // null => key unused this window => full points available
  return res === null || res.remainingPoints > 0;
}

function waitMinutes(msBeforeNext: number) {
  return Math.max(1, Math.ceil(msBeforeNext / 60_000));
}

function rateLimitMessage(limits: RateLimits, msBeforeNext: number) {
  const wait = waitMinutes(msBeforeNext);
  return `You can post ${limits.count} message(s) every ${limits.minutes} minutes and at most ${limits.daily} messages every 24 hours. Please wait about ${wait} minute${wait === 1 ? "" : "s"}.`;
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

  const storeClient = getPool();
  const limiter = await new Promise<RateLimiterPostgres>((resolve, reject) => {
    const instance = new RateLimiterPostgres(
      {
        storeClient,
        // pg Pool constructs as BoundPool — force pool mode.
        storeType: "pool",
        points: opts.points,
        duration: opts.duration,
        keyPrefix: opts.keyPrefix,
        tableName: "guestbook_rate_limits",
        tableCreated: tableReady,
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        tableReady = true;
        resolve(instance);
      },
    );
  });

  limiterCache.set(opts.keyPrefix, limiter);
  return limiter;
}

/**
 * Check daily then burst via get(); consume only when both have room so a
 * failed daily check does not leave a dangling burst consume (and vice versa).
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
    // Daily first (longer window); burst second. Rare race: accept spent points.
    await daily.consume(key);
    await burst.consume(key);
  } catch (err) {
    const res = err as RateLimiterRes;
    const ms =
      typeof res?.msBeforeNext === "number" ? res.msBeforeNext : 60_000;
    return { ok: false, error: rateLimitMessage(limits, ms) };
  }

  return { ok: true };
}
