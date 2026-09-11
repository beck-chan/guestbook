import { loadAllowlist } from "../_shared/allowlist.ts";
import {
  adminUrl,
  asEmail,
  flagNotifOn,
  jsonResponse,
  verifyNotifySecret,
} from "../_shared/env.ts";
import { sendAll, type Mail } from "../_shared/resend.ts";

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
  const mails: Mail[] = allowlist.map((to) => {
    if (to === email) {
      return {
        to,
        subject: "You signed in as a guestbook admin",
        text: [
          "Your Google account signed in to the guestbook admin for the first time.",
          `Open ${admin}`,
        ].join("\n"),
        idempotencyKey: `auth:created:${email}:self`,
      };
    }
    return {
      to,
      subject: `${email} signed in as a guestbook admin`,
      text: [
        `${email} completed Google sign-in as a guestbook admin for the first time.`,
        `Admin: ${admin}`,
      ].join("\n"),
      idempotencyKey: `auth:created:${email}:to:${to}`,
    };
  });

  if (!allowlist.includes(email)) {
    mails.push({
      to: email,
      subject: "You signed in as a guestbook admin",
      text: [
        "Your Google account signed in to the guestbook admin for the first time.",
        `Open ${admin}`,
      ].join("\n"),
      idempotencyKey: `auth:created:${email}:self`,
    });
  }

  if (mails.length === 0) {
    return jsonResponse(200, { skipped: "no recipients" });
  }

  const sent = await sendAll(mails);
  if (!sent.ok) {
    return jsonResponse(500, { error: sent.error ?? "Resend failed" });
  }
  return jsonResponse(200, { ok: true, sent: mails.length });
});

function userEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const direct = asEmail(root.email);
  if (direct) return direct;
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
