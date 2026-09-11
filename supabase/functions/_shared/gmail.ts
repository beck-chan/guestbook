export type Mail = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

type TokenCache = { token: string; exp: number };

let tokenCache: TokenCache | null = null;

function utf8ToBinary(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

function toBase64Url(value: string): string {
  return btoa(utf8ToBinary(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const FROM_NAME = "y2k Guestbook";

function fromHeader(email: string): string {
  const name = FROM_NAME.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${name}" <${email}>`;
}

function rfc2822(mail: Mail, from: string): string {
  const subject = `=?UTF-8?B?${btoa(utf8ToBinary(mail.subject))}?=`;
  return [
    `From: ${from}`,
    `To: ${mail.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    mail.text,
  ].join("\r\n");
}

async function accessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.exp - 60_000) {
    return { ok: true, token: tokenCache.token };
  }

  const clientId = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      ok: false,
      error: "Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN",
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    return {
      ok: false,
      error: json.error_description ?? json.error ?? `${res.status}`,
    };
  }

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3500;
  tokenCache = { token: json.access_token, exp: now + expiresIn * 1000 };
  return { ok: true, token: json.access_token };
}

export async function sendGmail(
  mail: Mail,
): Promise<{ ok: boolean; error?: string }> {
  const from = (Deno.env.get("GMAIL_USER") ?? "").trim();
  if (!from.includes("@")) {
    return { ok: false, error: "Missing GMAIL_USER" };
  }

  const token = await accessToken();
  if (!token.ok) return token;

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: toBase64Url(rfc2822(mail, fromHeader(from))) }),
    },
  );

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
    const result = await sendGmail(mail);
    if (!result.ok) return result;
  }
  return { ok: true };
}
