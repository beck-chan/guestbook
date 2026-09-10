function envFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

function envString(value: string | undefined, fallback: string) {
  if (value === undefined) return fallback;
  return value.trim();
}

export const flags = {
  // Static process.env.* access so Next can inline these for client components.
  docs: envFlag(process.env.FLAG_DOCS, true), // Show docs link
  docsOnly: envFlag(process.env.FLAG_DOCSONLY, false), // Only serve /docs (skip desk, guestbook, admin)
  hitCounter: envFlag(process.env.FLAG_COUNTER, true), // Show hit counter
  /** Comma-separated paths/URLs for unique-visitor query (empty = all $pageview events). */
  hitCounterUrl: envString(process.env.FLAG_COUNTER_URL, ""),
  public: envFlag(process.env.FLAG_PUBLIC, false), // Show public guestbook home/public repo + dark green favicon
  apiTest: envFlag(process.env.FLAG_APITEST, false), // Show API Test Request on private docs
};

const githubRepo = flags.public ? "y2k-guestbook" : "guestbook";
const githubBase = `https://github.com/beck-chan/${githubRepo}`;

export const docsIndexSubtitle = flags.public
  ? "Install your own mobile-friendly, retro-inspired guestbook powered by Next.js, Supabase, and Vercel.\n*Add optional analytics with PostHog and notifications with Resend." // public = true
  : "Install your own mobile-friendly, retro-inspired guestbook powered by Next.js, Supabase, and Vercel.\n*Reference section for this documentation version reflects the functionality of Beck's custom install."; // public = false

export const docsUrl = "/docs";
export const getStartedUrl = "/docs/quickstart/";
export const reportIssueUrl = `${githubBase}/issues`;
export const releasesUrl = `${githubBase}/releases`;
