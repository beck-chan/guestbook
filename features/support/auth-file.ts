import path from "node:path";

/** Saved Google admin cookies. Gitignored — do not commit. */
export const adminAuthFile = path.join(
  process.cwd(),
  "features",
  "support",
  ".auth",
  "admin.json",
);
