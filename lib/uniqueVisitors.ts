import { unstable_cache } from "next/cache";
import { flags } from "@/lib/flags";
import { FALLBACK_HIT_COUNT } from "@/lib/hitCount";

export { FALLBACK_HIT_COUNT };

function escapeHogqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function uniqueVisitorsQuery(urlFilter: string) {
  let query =
    "SELECT uniq(distinct_id) FROM events WHERE event = '$pageview'";
  if (!urlFilter) {
    return query;
  }
  const escaped = escapeHogqlString(urlFilter);
  // Full URL → substring on $current_url; path (e.g. / or /guestbook) → exact $pathname
  if (urlFilter.includes("://")) {
    query += ` AND properties.$current_url LIKE '%${escaped}%'`;
  } else {
    query += ` AND properties.$pathname = '${escaped}'`;
  }
  return query;
}

async function fetchUniqueVisitors(urlFilter: string): Promise<number> {
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
            query: uniqueVisitorsQuery(urlFilter),
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
  return unstable_cache(
    () => fetchUniqueVisitors(urlFilter),
    ["posthog-unique-visitors", urlFilter || "all"],
    { revalidate: 60 },
  )();
}
