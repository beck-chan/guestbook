/**
 * Copy this file to instrumentation-client.ts in the project root.
 * Next.js only loads that exact filename. Do not paste the HTML snippet here.
 */
import posthog from "posthog-js";

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-05-30",
    person_profiles: "always",
  });
}
