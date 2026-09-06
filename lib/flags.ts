function envFlag(name: string, fallback: boolean) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

function envString(name: string, fallback: string) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.trim();
}

export const flags = {
  docs: envFlag("FLAG_DOCS", true), // Show docs link
  hitCounter: envFlag("FLAG_COUNTER", true), // Show hit counter
  /** Path or URL substring for unique-visitor query (empty = all $pageview events). */
  hitCounterUrl: envString("FLAG_COUNTER_URL", ""),
  public: envFlag("FLAG_PUBLIC", false), // Show public guestbook home/public repo + dark green favicon
};

const githubRepo = flags.public ? "y2k-guestbook" : "guestbook";
const githubBase = `https://github.com/beck-chan/${githubRepo}`;

export const docsUrl = "/docs";
export const getStartedUrl = "/docs/quickstart/";
export const reportIssueUrl = `${githubBase}/issues`;
export const releasesUrl = `${githubBase}/releases`;
