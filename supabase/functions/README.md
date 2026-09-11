# Admin notification emails

Database Webhooks and an Auth hook POST these Edge Functions; the functions send mail through the **Gmail API** (HTTPS) as `GMAIL_USER`. Next.js and `npm run allow-admin` / `delete-admin` only write rows — do not also send from the app.

This is **not** a Gmail App Password or SMTP. App Passwords talk SMTP; Edge Functions cannot reliably use Gmail’s SMTP ports.

Mail is off until **`FLAG_NOTIF=true` as a Supabase secret**. Next `.env.local` / Vercel `FLAG_NOTIF` does not reach Deno.

Gmail has no send idempotency key. Webhook retries can deliver the same mail twice.

## Deploy

From this repo (after `npx supabase link`):

```bash
npx supabase functions deploy notify-admins on-user-created
```

`verify_jwt` is off in `supabase/config.toml`. Webhooks and Auth hooks do not send a user JWT. Both functions check `NOTIFY_WEBHOOK_SECRET` instead.

## Secrets

```bash
npx supabase secrets set FLAG_NOTIF=false
npx supabase secrets set GMAIL_USER=you@gmail.com
npx supabase secrets set GMAIL_CLIENT_ID=....apps.googleusercontent.com
npx supabase secrets set GMAIL_CLIENT_SECRET=...
npx supabase secrets set GMAIL_REFRESH_TOKEN=...
npx supabase secrets set SITE_URL=https://your-host
npx supabase secrets set NOTIFY_WEBHOOK_SECRET=<long-random-string>
```

Optional: `GUESTBOOK_ADMIN_PATH=/admin` if the dashboard is not at `/admin`.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected.

Turn mail on:

```bash
npx supabase secrets set FLAG_NOTIF=true
```

Set the same `FLAG_NOTIF=true` in `.env.local` and Vercel so the Next flag matches. That Next value does not send mail by itself.

If you previously set `RESEND_*` secrets, unset them; they are unused.

## Database Webhooks

Dashboard → **Integrations** → **Database Webhooks** → **Create a new hook**.

URL:

`https://<project-ref>.supabase.co/functions/v1/notify-admins`

HTTP headers:

- `x-notify-webhook-secret`: the same value as `NOTIFY_WEBHOOK_SECRET`
- `Content-Type`: `application/json`

Create one hook per table/events below (or one hook that listens to each table):

| Table | Events |
| --- | --- |
| `public.admin_allowlist` | INSERT, DELETE (not UPDATE) |
| `public.comments` | INSERT, UPDATE, DELETE |
| `public.guestbook_settings` | UPDATE |
| `public.poem_hearts` | INSERT, DELETE |

`poem_hearts` is Poetry Guestbook only (this project). Do not add that table on y2k-guestbook.

The function skips comment UPDATE rows that only change `is_read` / `updated_at`, allowlist UPDATE (re-running `allow-admin`), empty allowlists, and `FLAG_NOTIF` off (HTTP 200, no send).

## After User Created

Dashboard → **Authentication** → **Hooks** → **After User Created**.

- Hook type: HTTP
- URL: `https://<project-ref>.supabase.co/functions/v1/on-user-created`
- HTTP secret / Authorization: Bearer `NOTIFY_WEBHOOK_SECRET` (same secret)

Before User Created stays the existing Postgres `hook_before_user_created` function. After User Created only runs for allowlisted first signups.

## Gmail API

Do **not** add `gmail.send` to the guestbook admin Google login. This mailbox is only for sending notifications.

1. In [Google Cloud](https://console.cloud.google.com/), enable **Gmail API**.
2. Create an OAuth client (Desktop is fine). Keep the guestbook Sign in with Google client unchanged.
3. Put the sending Gmail on the OAuth consent screen as a **test user** (Testing status is enough for a private mailbox).
4. In [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/), use your own client id/secret, authorize `https://www.googleapis.com/auth/gmail.send` as that Gmail, exchange the code, copy **Refresh token**.
5. Set `GMAIL_USER` to that address. Recipients see mail from that Gmail.

Personal Gmail has a low daily send cap. Google can revoke the refresh token; run the Playground steps again and update `GMAIL_REFRESH_TOKEN`. Ignore App Passwords for this setup.
