import { headers } from "next/headers";

/** Vercel geo header, e.g. `America/Los_Angeles`. Missing locally. */
export async function getRequestTimeZone(): Promise<string | undefined> {
  const timeZone = (await headers()).get("x-vercel-ip-timezone")?.trim();
  if (!timeZone) {
    return undefined;
  }
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return undefined;
  }
}
