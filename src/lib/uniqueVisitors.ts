import { connection } from "next/server";
import { HIT_COUNT_REFRESH_MS, type HitCountResult } from "@/lib/hitCount";

const QUERY_ERROR: HitCountResult = { count: 0, error: true };

function ok(count: number): HitCountResult {
  return { count, error: false };
}

function escapeHogqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function productionHost() {
  const raw = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).host;
  } catch {
    return "";
  }
}

function exactPathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

function urlFilterClause(urlFilter: string, fallbackHost: string) {
  if (urlFilter.includes("://")) {
    try {
      const parsed = new URL(urlFilter);
      const host = escapeHogqlString(parsed.host);
      const path = escapeHogqlString(exactPathname(parsed.pathname));
      return `(properties.$host = '${host}' AND properties.$pathname = '${path}')`;
    } catch {
      const path = escapeHogqlString(exactPathname(urlFilter));
      return `properties.$pathname = '${path}'`;
    }
  }

  const path = escapeHogqlString(exactPathname(urlFilter));
  if (fallbackHost) {
    return `(properties.$host = '${escapeHogqlString(fallbackHost)}' AND properties.$pathname = '${path}')`;
  }
  return `properties.$pathname = '${path}'`;
}

function dateFilterClause(dateStamp: string) {
  const trimmed = dateStamp.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return null;
  // PostHog/HogQL UTC: "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss" (T/Z optional)
  const day = /^(\d{4}-\d{2}-\d{2})$/.exec(trimmed);
  if (day) {
    return `timestamp >= toDateTime('${day[1]} 00:00:00', 'UTC')`;
  }
  const instant = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:Z)?$/.exec(
    trimmed,
  );
  if (instant) {
    return `timestamp >= toDateTime('${instant[1]} ${instant[2]}', 'UTC')`;
  }
  return null;
}

function uniqueVisitorsQuery(
  urlFilter: string,
  dateFilter: string,
  fallbackHost: string,
) {
  let query =
    "SELECT uniq(distinct_id) FROM events WHERE event = '$pageview'";
  const filters = urlFilter
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (filters.length === 1) {
    query += ` AND ${urlFilterClause(filters[0], fallbackHost)}`;
  } else if (filters.length > 1) {
    query += ` AND (${filters.map((part) => urlFilterClause(part, fallbackHost)).join(" OR ")})`;
  }
  const dateClause = dateFilterClause(dateFilter);
  if (dateClause) {
    query += ` AND ${dateClause}`;
  }
  return query;
}

async function fetchUniqueVisitors(
  urlFilter: string,
  dateFilter: string,
  fallbackHost: string,
): Promise<HitCountResult> {
  if (process.env.NODE_ENV !== "production") {
    return QUERY_ERROR;
  }

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiHost =
    process.env.POSTHOG_API_HOST?.replace(/\/$/, "") ||
    "https://us.posthog.com";

  if (!apiKey || !projectId) {
    return QUERY_ERROR;
  }

  const hogql = uniqueVisitorsQuery(urlFilter, dateFilter, fallbackHost);
  try {
    const response = await fetch(
      `${apiHost}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: hogql,
          },
          // Default `blocking` returns PostHog's cached uniq until cache_target_age
          // (often minutes). The SQL editor runs fresh; match that here.
          refresh: "force_blocking",
          name: "guestbook_unique_visitors",
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "PostHog unique visitors query failed",
        response.status,
        hogql,
      );
      return QUERY_ERROR;
    }

    const data = (await response.json()) as { results?: unknown[][] };
    const value = data.results?.[0]?.[0];
    const count = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(count) || count < 0) {
      return QUERY_ERROR;
    }

    return ok(Math.floor(count));
  } catch (error) {
    console.error("PostHog unique visitors query failed", error);
    return QUERY_ERROR;
  }
}

type VisitorCountCache = {
  key: string;
  value: number;
  expiresAt: number;
};

let visitorCountCache: VisitorCountCache | null = null;
let visitorCountInflight: {
  key: string;
  promise: Promise<HitCountResult>;
} | null = null;

export async function getUniqueVisitors(): Promise<HitCountResult> {
  // Read at request time (not from flags.ts) so FLAG_COUNTER_* are not
  // build-inlined via next.config env / client imports.
  await connection();
  const urlFilter = (process.env.FLAG_COUNTER_URL ?? "").trim();
  const dateFilter = (process.env.FLAG_COUNTER_DATE ?? "").trim();
  const fallbackHost = productionHost();
  const key = `${urlFilter}|${dateFilter}|${fallbackHost}`;
  const now = Date.now();
  if (
    visitorCountCache &&
    visitorCountCache.key === key &&
    visitorCountCache.expiresAt > now
  ) {
    return ok(visitorCountCache.value);
  }
  if (visitorCountInflight && visitorCountInflight.key === key) {
    return visitorCountInflight.promise;
  }
  const promise = fetchUniqueVisitors(urlFilter, dateFilter, fallbackHost).then(
    (result) => {
      // Do not cache 0 or errors: an empty window or a failed query would
      // otherwise stick after PostHog has rows or recovers.
      if (!result.error && result.count > 0) {
        visitorCountCache = {
          key,
          value: result.count,
          expiresAt: Date.now() + HIT_COUNT_REFRESH_MS,
        };
      } else {
        visitorCountCache = null;
      }
      return result;
    },
  );
  visitorCountInflight = { key, promise };
  try {
    return await promise;
  } finally {
    if (visitorCountInflight?.promise === promise) {
      visitorCountInflight = null;
    }
  }
}
