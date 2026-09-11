# Poem heart notifications

`notify-admins` emails the admin allowlist when someone hearts or unhearts a poem. Heart/unheart is `toggle_poem_heart`, which **inserts** or **deletes** a `public.poem_hearts` row.

This is extra to the board hooks in `/docs/notifs` (`admin_allowlist`, `comments`, `guestbook_settings`). y2k-guestbook has no poetry desk and does not use this table.

## Enable Database Webhooks (once)

If Webhooks is not in **Integrations → Installed**:

1. **Integrations** → **Explore all**
2. Select **Database Webhooks**
3. **Install integration** (confirm if asked)
4. Open the **Webhooks** tab

Direct URL: `https://supabase.com/dashboard/project/<your-database-url>/integrations/webhooks/overview`

## Hook for poem hearts

Create a hook (or add this table to the existing `notify-admins` HTTP hook):

| Table | Events |
| --- | --- |
| `public.poem_hearts` | INSERT, DELETE |

Do **not** enable UPDATE. Toggling a heart does not update the row.

- **Type of webhook:** HTTP Request
- **Method:** `POST`
- **URL:** `https://<your-database-url>.supabase.co/functions/v1/notify-admins`

HTTP headers:

| Name | Value |
| --- | --- |
| `x-notify-webhook-secret` | Same string as the `NOTIFY_WEBHOOK_SECRET` Supabase secret |
| `Content-Type` | `application/json` |

Mail stays off until `FLAG_NOTIF=true` is set as a **Supabase secret** (Next `.env.local` does not reach the function).
