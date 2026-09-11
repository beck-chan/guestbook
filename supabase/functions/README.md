# Admin notification emails

Database Webhooks and an Auth hook POST these Edge Functions; the functions send Resend mail. Next.js and `npm run allow-admin` / `delete-admin` only write rows — do not also call Resend from the app.

Mail is off until **`FLAG_NOTIF=true` as a Supabase secret**. Next `.env.local` / Vercel `FLAG_NOTIF` does not reach Deno.

## Deploy

From this repo (after `npx supabase link`):

```bash
npx supabase functions deploy notify-admins on-user-created
```

`verify_jwt` is off in `supabase/config.toml`. Webhooks and Auth hooks do not send a user JWT. Both functions check `NOTIFY_WEBHOOK_SECRET` instead.

## Secrets

```bash
npx supabase secrets set FLAG_NOTIF=false
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set RESEND_FROM="Guestbook <admin@yourdomain>"
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

The function skips comment UPDATE rows that only change `is_read` / `updated_at`, allowlist UPDATE (re-running `allow-admin`), empty allowlists, and `FLAG_NOTIF` off (HTTP 200, no Resend).

## After User Created

Dashboard → **Authentication** → **Hooks** → **After User Created**.

- Hook type: HTTP
- URL: `https://<project-ref>.supabase.co/functions/v1/on-user-created`
- HTTP secret / Authorization: Bearer `NOTIFY_WEBHOOK_SECRET` (same secret)

Before User Created stays the existing Postgres `hook_before_user_created` function. After User Created only runs for allowlisted first signups.

## Resend

1. Add and verify a sending domain in [Resend](https://resend.com) (**Domains**).
2. Create an API key with **Sending access**, locked to that domain.
3. Set `RESEND_FROM` to an address on that domain (for example `Guestbook <admin@yourdomain>`).
