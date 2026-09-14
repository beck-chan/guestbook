/**
 * Copy this file to src/instrumentation-client.ts (or the project root if
 * there is no src/). Next.js only loads that exact filename. Do not paste
 * the HTML snippet here.
 */
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY
) {
  void import("posthog-js").then(({ default: posthog }) => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2026-05-30",
      person_profiles: "always",
    });
  });
}
