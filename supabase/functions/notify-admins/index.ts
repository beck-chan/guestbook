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
import { sendAll, type Mail } from "../_shared/gmail.ts";
import { loadMail } from "../_shared/template.ts";

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
      return jsonResponse(500, { error: sent.error ?? "Gmail send failed" });
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
      const vars = { admin, email: added };
      const selfCopy = await loadMail("allowlist-added-self", vars);
      const othersCopy = await loadMail("allowlist-added", vars);
      return allowlistMails(
        recipients,
        added,
        selfCopy,
        othersCopy,
        `allowlist:insert:${added}`,
      );
    }
    if (type === "DELETE") {
      const removed = asEmail(oldRecord?.email);
      if (!removed) return [];
      const vars = { admin, email: removed };
      const othersCopy = await loadMail("allowlist-removed", vars);
      const selfCopy = await loadMail("allowlist-removed-self", vars);
      const mails: Mail[] = allowlist.map((to) => ({
        to,
        ...othersCopy,
        idempotencyKey: `allowlist:delete:${removed}:to:${to}`,
      }));
      mails.push({
        to: removed,
        ...selfCopy,
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
      const copy = await loadMail("comment-insert", { admin, name, body });
      return allowlist.map((to) => ({
        to,
        ...copy,
        idempotencyKey: `comment:insert:${id}:${to}`,
      }));
    }
    if (type === "UPDATE") {
      if (!commentContentChanged(oldRecord, record)) return [];
      const name = snippet(record?.display_name, 80) || "someone";
      const body = snippet(record?.body);
      const id = str(record?.id) || "edit";
      const copy = await loadMail("comment-update", { admin, name, body });
      return allowlist.map((to) => ({
        to,
        ...copy,
        idempotencyKey: `comment:update:${id}:${to}`,
      }));
    }
    if (type === "DELETE") {
      const name = snippet(oldRecord?.display_name, 80) || "someone";
      const body = snippet(oldRecord?.body);
      const id = str(oldRecord?.id) || "deleted";
      const copy = await loadMail("comment-delete", { admin, name, body });
      return allowlist.map((to) => ({
        to,
        ...copy,
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
    const copy = await loadMail("settings-update", { admin, summary });
    return allowlist.map((to) => ({
      to,
      ...copy,
      idempotencyKey: `settings:update:${changed.join(",")}:${to}`,
    }));
  }

  if (table === "poem_hearts") {
    if (allowlist.length === 0) return [];
    const poemId =
      snippet(record?.poem_id ?? oldRecord?.poem_id, 80) || "a poem";
    const id = str(record?.id ?? oldRecord?.id) || poemId;
    const vars = { admin, poem_id: poemId };
    if (type === "INSERT") {
      const copy = await loadMail("poem-hearted", vars);
      return allowlist.map((to) => ({
        to,
        ...copy,
        idempotencyKey: `poem_hearts:insert:${id}:${to}`,
      }));
    }
    if (type === "DELETE") {
      const copy = await loadMail("poem-unhearted", vars);
      return allowlist.map((to) => ({
        to,
        ...copy,
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
  others: { subject: string; text: string },
  keyPrefix: string,
): Mail[] {
  return allowlist.map((to) => {
    const copy = to === subjectEmail ? self : others;
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
