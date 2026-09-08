export const DEFAULT_PROJECT_REF = "your-database-url";

export function parseProjectRef(raw: string): string {
  const trimmed = raw.trim();
  const hosted = trimmed.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (hosted) {
    return hosted[1].toLowerCase();
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function supabaseRestUrl(projectRef = DEFAULT_PROJECT_REF): string {
  const ref = parseProjectRef(projectRef) || DEFAULT_PROJECT_REF;
  return `https://${ref}.supabase.co/rest/v1`;
}

export function publicApiServers(projectRef = DEFAULT_PROJECT_REF) {
  return [
    {
      url: supabaseRestUrl(projectRef),
      description: "Your Supabase Server URL",
    },
  ];
}
