export const flags = {
  docs: true, // Show docs link
  hitCounter: true, // Show hit counter
  public: false, // Public guestbook home/public repo + dark green favicon
} as const;

const githubRepo = flags.public ? "y2k-guestbook" : "guestbook";
const githubBase = `https://github.com/beck-chan/${githubRepo}`;

export const docsUrl = "/docs";
export const getStartedUrl = "/docs/quickstart/";
export const reportIssueUrl = `${githubBase}/issues`;
export const releasesUrl = `${githubBase}/releases`;
// 