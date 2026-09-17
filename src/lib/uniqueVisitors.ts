import { connection } from "next/server";
import { FALLBACK_HIT_COUNT, HIT_COUNT_REFRESH_MS } from "@/lib/hitCount";

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

/** events_recent keeps ~7 days of fresher rows than `events`. */
const EVENTS_RECENT_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000;

function hogqlEventsTable(dateFilter: string): "events" | "events_recent" {
  const trimmed = dateFilter.trim().replace(/^['"]|['"]$/g, "");
  const day = /^(\d{4}-\d{2}-\d{2})$/.exec(trimmed);
  const instant = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:Z)?$/.exec(
    trimmed,
  );
  const start = day
    ? Date.parse(`${day[1]}T00:00:00Z`)
    : instant
      ? Date.parse(`${instant[1]}T${instant[2]}Z`)
      : Number.NaN;
  if (
    !Number.isFinite(start) ||
    Date.now() - start > EVENTS_RECENT_MAX_AGE_MS
  ) {
    return "events";
  }
  return "events_recent";
}

function uniqueVisitorsQuery(
  urlFilter: string,
  dateFilter: string,
  fallbackHost: string,
  table: "events" | "events_recent" = "events",
) {
  let query = `SELECT uniq(distinct_id) FROM ${table} WHERE event = '$pageview'`;
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
): Promise<number> {
  if (process.env.NODE_ENV !== "production") {
    return FALLBACK_HIT_COUNT;
  }

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiHost =
    process.env.POSTHOG_API_HOST?.replace(/\/$/, "") ||
    "https://us.posthog.com";

  if (!apiKey || !projectId) {
    return FALLBACK_HIT_COUNT;
  }

  async function queryCount(
    table: "events" | "events_recent",
  ): Promise<number | null> {
    const hogql = uniqueVisitorsQuery(
      urlFilter,
      dateFilter,
      fallbackHost,
      table,
    );
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
        return null;
      }

      const data = (await response.json()) as { results?: unknown[][] };
      const value = data.results?.[0]?.[0];
      const count = typeof value === "number" ? value : Number(value);

      if (!Number.isFinite(count) || count < 0) {
        return null;
      }

      return Math.floor(count);
    } catch (error) {
      console.error("PostHog unique visitors query failed", error);
      return null;
    }
  }

  const table = hogqlEventsTable(dateFilter);
  const value =
    (await queryCount(table)) ??
    (table === "events_recent" ? await queryCount("events") : null);
  return value ?? FALLBACK_HIT_COUNT;
}

type VisitorCountCache = {
  key: string;
  value: number;
  expiresAt: number;
};

let visitorCountCache: VisitorCountCache | null = null;

export async function getUniqueVisitors() {
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
    return visitorCountCache.value;
  }
  const value = await fetchUniqueVisitors(urlFilter, dateFilter, fallbackHost);
  // Do not cache 0: a cutoff in the near future (or a just-empty window)
  // would otherwise stick at 000000 after PostHog has rows.
  if (value > 0) {
    visitorCountCache = { key, value, expiresAt: now + HIT_COUNT_REFRESH_MS };
  } else {
    visitorCountCache = null;
  }
  return value;
}
