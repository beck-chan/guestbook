import { loadAllowlist } from "../_shared/allowlist.ts";
import {
  adminUrl,
  asEmail,
  flagNotifOn,
  jsonResponse,
  verifyNotifySecret,
} from "../_shared/env.ts";
import { sendAll, type Mail } from "../_shared/gmail.ts";
import { loadMail } from "../_shared/template.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }
  if (!verifyNotifySecret(req)) {
    return jsonResponse(401, { error: "Unauthorized" });
  }
  if (!flagNotifOn()) {
    return jsonResponse(200, { skipped: "FLAG_NOTIF" });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const email = userEmail(payload);
  if (!email) {
    return jsonResponse(200, { skipped: "no email" });
  }

  const allowlist = await loadAllowlist();
  const admin = adminUrl();
  const vars = { admin, email };
  const selfCopy = await loadMail("auth-created-self", vars);
  const othersCopy = await loadMail("auth-created", vars);
  const mails: Mail[] = allowlist.map((to) => {
    const copy = to === email ? selfCopy : othersCopy;
    return {
      to,
      ...copy,
      idempotencyKey:
        to === email
          ? `auth:created:${email}:self`
          : `auth:created:${email}:to:${to}`,
    };
  });

  if (!allowlist.includes(email)) {
    mails.push({
      to: email,
      ...selfCopy,
      idempotencyKey: `auth:created:${email}:self`,
    });
  }

  if (mails.length === 0) {
    return jsonResponse(200, { skipped: "no recipients" });
  }

  const sent = await sendAll(mails);
  if (!sent.ok) {
    return jsonResponse(500, { error: sent.error ?? "Gmail send failed" });
  }
  return jsonResponse(200, { ok: true, sent: mails.length });
});

function userEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const direct = asEmail(root.email);
  if (direct) return direct;
  const record = root.record;
  if (record && typeof record === "object") {
    const fromRecord = asEmail((record as Record<string, unknown>).email);
    if (fromRecord) return fromRecord;
  }
  const user = root.user;
  if (user && typeof user === "object") {
    const fromUser = asEmail((user as Record<string, unknown>).email);
    if (fromUser) return fromUser;
  }
  const event = root.event;
  if (event && typeof event === "object") {
    const eventUser = (event as Record<string, unknown>).user;
    if (eventUser && typeof eventUser === "object") {
      return asEmail((eventUser as Record<string, unknown>).email);
    }
  }
  return null;
}
