export function flagNotifOn(): boolean {
  const v = (Deno.env.get("FLAG_NOTIF") ?? "").trim().toLowerCase();
  return v === "true" || v === "1";
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function verifyNotifySecret(req: Request): boolean {
  const expected = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const header = req.headers.get("x-notify-webhook-secret") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  return header === expected || bearer === expected || auth === expected;
}

export function adminUrl(): string {
  const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  const raw = Deno.env.get("GUESTBOOK_ADMIN_PATH") ?? "/admin";
  const path = raw.replace(/\/$/, "") || "/admin";
  const prefix = path.startsWith("/") ? path : `/${path}`;
  return site ? `${site}${prefix}` : prefix;
}

export function asEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export function snippet(value: unknown, max = 240): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

export function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
