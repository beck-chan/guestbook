export const DEFAULT_PROJECT_REF = "your-database-url";
export const PROJECT_REF_PLACEHOLDER = "<your-database-url>";

export function parseProjectRef(raw: string): string {
  const trimmed = raw.trim().replaceAll(/[<>]/g, "");
  const hosted = trimmed.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (hosted) {
    return hosted[1].toLowerCase();
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function displayProjectRef(projectRef = DEFAULT_PROJECT_REF): string {
  const ref = parseProjectRef(projectRef) || DEFAULT_PROJECT_REF;
  return ref === DEFAULT_PROJECT_REF ? PROJECT_REF_PLACEHOLDER : ref;
}

export function supabaseRestUrl(projectRef = DEFAULT_PROJECT_REF): string {
  return `https://${displayProjectRef(projectRef)}.supabase.co/rest/v1`;
}

export function envSupabaseProjectRef() {
  return parseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    || DEFAULT_PROJECT_REF;
}

export function publicApiServers(projectRef = DEFAULT_PROJECT_REF) {
  return [
    {
      url: supabaseRestUrl(projectRef),
      description: "Your Supabase Server URL",
    },
  ];
}
