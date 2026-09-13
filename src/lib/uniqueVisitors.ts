import { unstable_cache } from "next/cache";
import { flags } from "@/lib/flags";
import { FALLBACK_HIT_COUNT } from "@/lib/hitCount";

function escapeHogqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function urlFilterClause(urlFilter: string) {
  const escaped = escapeHogqlString(urlFilter);
  // Full URL → substring on $current_url; path (e.g. / or /guestbook) → exact $pathname
  if (urlFilter.includes("://")) {
    return `properties.$current_url LIKE '%${escaped}%'`;
  }
  return `properties.$pathname = '${escaped}'`;
}

const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function dateFilterClause(dateStamp: string) {
  if (!UTC_INSTANT.test(dateStamp) || !Number.isFinite(Date.parse(dateStamp))) {
    return null;
  }
  const hogqlDateTime = `${dateStamp.slice(0, 10)} ${dateStamp.slice(11, 19)}`;
  return `timestamp >= toDateTime('${escapeHogqlString(hogqlDateTime)}', 'UTC')`;
}

function uniqueVisitorsQuery(urlFilter: string, dateFilter: string) {
  let query =
    "SELECT uniq(distinct_id) FROM events WHERE event = '$pageview'";
  const filters = urlFilter
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (filters.length === 1) {
    query += ` AND ${urlFilterClause(filters[0])}`;
  } else if (filters.length > 1) {
    query += ` AND (${filters.map(urlFilterClause).join(" OR ")})`;
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

  try {
    const response = await fetch(
      `${apiHost}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: uniqueVisitorsQuery(urlFilter, dateFilter),
          },
          name: "guestbook_unique_visitors",
        }),
      },
    );

    if (!response.ok) {
      return FALLBACK_HIT_COUNT;
    }

    const data = (await response.json()) as { results?: unknown[][] };
    const value = data.results?.[0]?.[0];
    const count = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(count) || count < 0) {
      return FALLBACK_HIT_COUNT;
    }

    return Math.floor(count);
  } catch {
    return FALLBACK_HIT_COUNT;
  }
}

export async function getUniqueVisitors() {
  const urlFilter = flags.hitCounterUrl;
  const dateFilter = flags.hitCounterDate;
  return unstable_cache(
    () => fetchUniqueVisitors(urlFilter, dateFilter),
    ["posthog-unique-visitors", urlFilter || "all", dateFilter || "all"],
    { revalidate: 60 },
  )();
}
