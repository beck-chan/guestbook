import { loadAllowlist } from "../_shared/allowlist.ts";
import {
  adminUrl,
  asEmail,
  flagNotifOn,
  jsonResponse,
  snippet,
  str,
  verifyNotifySecret,
} from "../_shared/env.ts";
import { sendAll, type Mail } from "../_shared/resend.ts";

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

const SETTINGS_SKIP = new Set(["id", "updated_at"]);

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

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const table = payload.table ?? "";
  const type = (payload.type ?? "").toUpperCase();
  const record = payload.record ?? null;
  const oldRecord = payload.old_record ?? null;

  try {
    const mails = await mailsForEvent(table, type, record, oldRecord);
    if (mails === null) {
      return jsonResponse(200, { skipped: "unhandled" });
    }
    if (mails.length === 0) {
      return jsonResponse(200, { skipped: "no recipients" });
    }
    const sent = await sendAll(mails);
    if (!sent.ok) {
      return jsonResponse(500, { error: sent.error ?? "Resend failed" });
    }
    return jsonResponse(200, { ok: true, sent: mails.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: message });
  }
});

async function mailsForEvent(
  table: string,
  type: string,
  record: Record<string, unknown> | null,
  oldRecord: Record<string, unknown> | null,
): Promise<Mail[] | null> {
  const allowlist = await loadAllowlist();
  const admin = adminUrl();

  if (table === "admin_allowlist") {
    if (type === "INSERT") {
      const added = asEmail(record?.email);
      if (!added) return [];
      const recipients = [...new Set([...allowlist, added])];
      return allowlistMails(
        recipients,
        added,
        {
          subject: "You were added as a guestbook admin",
          text: [
            "Your Google account was added to the guestbook admin allowlist.",
            `Sign in at ${admin}`,
          ].join("\n"),
        },
        (email) => ({
          subject: `${email} was added as a guestbook admin`,
          text: [
            `${email} was added to the guestbook admin allowlist.`,
            `Admin: ${admin}`,
          ].join("\n"),
        }),
        `allowlist:insert:${added}`,
      );
    }
    if (type === "DELETE") {
      const removed = asEmail(oldRecord?.email);
      if (!removed) return [];
      const mails: Mail[] = allowlist.map((to) => ({
        to,
        subject: `${removed} was removed as a guestbook admin`,
        text: [
          `${removed} was removed from the guestbook admin allowlist.`,
          `Admin: ${admin}`,
        ].join("\n"),
        idempotencyKey: `allowlist:delete:${removed}:to:${to}`,
      }));
      mails.push({
        to: removed,
        subject: "Your guestbook admin access was removed",
        text: "Your Google account was removed from the guestbook admin allowlist.",
        idempotencyKey: `allowlist:delete:${removed}:self`,
      });
      return mails;
    }
    return null;
  }

  if (table === "comments") {
    if (allowlist.length === 0) return [];
    if (type === "INSERT") {
      const name = snippet(record?.display_name, 80) || "someone";
      const body = snippet(record?.body);
      const id = str(record?.id) || "new";
      return allowlist.map((to) => ({
        to,
        subject: `New guestbook comment from ${name}`,
        text: [`${name} signed the guestbook.`, body, `Admin: ${admin}`]
          .filter(Boolean)
          .join("\n\n"),
        idempotencyKey: `comment:insert:${id}:${to}`,
      }));
    }
    if (type === "UPDATE") {
      if (!commentContentChanged(oldRecord, record)) return [];
      const name = snippet(record?.display_name, 80) || "someone";
      const body = snippet(record?.body);
      const id = str(record?.id) || "edit";
      return allowlist.map((to) => ({
        to,
        subject: `Guestbook comment edited (${name})`,
        text: [`A comment by ${name} was edited.`, body, `Admin: ${admin}`]
          .filter(Boolean)
          .join("\n\n"),
        idempotencyKey: `comment:update:${id}:${to}`,
      }));
    }
    if (type === "DELETE") {
      const name = snippet(oldRecord?.display_name, 80) || "someone";
      const body = snippet(oldRecord?.body);
      const id = str(oldRecord?.id) || "deleted";
      return allowlist.map((to) => ({
        to,
        subject: `Guestbook comment deleted (${name})`,
        text: [`A comment by ${name} was deleted.`, body, `Admin: ${admin}`]
          .filter(Boolean)
          .join("\n\n"),
        idempotencyKey: `comment:delete:${id}:${to}`,
      }));
    }
    return null;
  }

  if (table === "guestbook_settings") {
    if (type !== "UPDATE") return null;
    if (allowlist.length === 0) return [];
    const changed = changedKeys(oldRecord, record, SETTINGS_SKIP);
    if (changed.length === 0) return [];
    const summary = changed
      .map((key) => `${key}: ${snippet(str(record?.[key]), 80)}`)
      .join("\n");
    return allowlist.map((to) => ({
      to,
      subject: "Guestbook settings updated",
      text: [`Guestbook settings were saved.`, summary, `Admin: ${admin}`].join(
        "\n\n",
      ),
      idempotencyKey: `settings:update:${changed.join(",")}:${to}`,
    }));
  }

  if (table === "poem_hearts") {
    if (allowlist.length === 0) return [];
    const poemId =
      snippet(record?.poem_id ?? oldRecord?.poem_id, 80) || "a poem";
    const id = str(record?.id ?? oldRecord?.id) || poemId;
    if (type === "INSERT") {
      return allowlist.map((to) => ({
        to,
        subject: `Poem hearted: ${poemId}`,
        text: [`Someone hearted ${poemId}.`, `Admin: ${admin}`].join("\n"),
        idempotencyKey: `poem_hearts:insert:${id}:${to}`,
      }));
    }
    if (type === "DELETE") {
      return allowlist.map((to) => ({
        to,
        subject: `Poem unhearted: ${poemId}`,
        text: [`Someone unhearted ${poemId}.`, `Admin: ${admin}`].join("\n"),
        idempotencyKey: `poem_hearts:delete:${id}:${to}`,
      }));
    }
    return null;
  }

  return null;
}

function allowlistMails(
  allowlist: string[],
  subjectEmail: string,
  self: { subject: string; text: string },
  others: (email: string) => { subject: string; text: string },
  keyPrefix: string,
): Mail[] {
  return allowlist.map((to) => {
    const copy = to === subjectEmail ? self : others(subjectEmail);
    return {
      to,
      ...copy,
      idempotencyKey: `${keyPrefix}:${to}`,
    };
  });
}

function commentContentChanged(
  oldRecord: Record<string, unknown> | null,
  record: Record<string, unknown> | null,
): boolean {
  const keys = ["display_name", "email", "body"] as const;
  return keys.some((key) => str(oldRecord?.[key]) !== str(record?.[key]));
}

function changedKeys(
  oldRecord: Record<string, unknown> | null,
  record: Record<string, unknown> | null,
  skip: Set<string>,
): string[] {
  const keys = new Set([
    ...Object.keys(oldRecord ?? {}),
    ...Object.keys(record ?? {}),
  ]);
  return [...keys]
    .filter((key) => !skip.has(key))
    .filter((key) => str(oldRecord?.[key]) !== str(record?.[key]))
    .sort();
}
