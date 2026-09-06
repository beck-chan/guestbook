import { unstable_cache } from "next/cache";
import { FALLBACK_HIT_COUNT } from "@/lib/hitCount";

export { FALLBACK_HIT_COUNT };

async function fetchUniqueVisitors(): Promise<number> {
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
            query:
              "SELECT uniq(distinct_id) FROM events WHERE event = '$pageview'",
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

export const getUniqueVisitors = unstable_cache(
  fetchUniqueVisitors,
  ["posthog-unique-visitors"],
  { revalidate: 60 },
);
