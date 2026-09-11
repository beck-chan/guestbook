export type Mail = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

export async function sendResend(
  mail: Mail,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM") ?? "";
  if (!apiKey || !from) {
    return { ok: false, error: "Missing RESEND_API_KEY or RESEND_FROM" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": mail.idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `${res.status} ${body}` };
  }
  return { ok: true };
}

export async function sendAll(
  mails: Mail[],
): Promise<{ ok: boolean; error?: string }> {
  for (const mail of mails) {
    const result = await sendResend(mail);
    if (!result.ok) return result;
  }
  return { ok: true };
}
