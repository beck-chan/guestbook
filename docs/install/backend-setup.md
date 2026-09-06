# Backend setup (human checklist)

One shared Supabase project for **guestbook** and **y2k-guestbook**. Complete these steps once, then put the **same** keys in both apps' `.env.local` files (`SITE_URL` may differ per origin).

Agent-owned files (`lib/supabase/`, `docs/install/schema.sql`, `scripts/allow-admin.ts`, keep-alive workflow) already ship in the repo. You do **not** recreate them.

## Why Google is not private by default

Enabling Google lets anyone with a Google account finish OAuth. Supabase then creates an `auth.users` row. Turning email signups off does **not** reliably stop first-time Google logins.

**How "just me" works:** `admin_allowlist` + [Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook). If the email is not on the list, signup is rejected and **no user is created**. Existing allowlisted users can sign in again (the hook only runs on create). Adding another admin later: insert their email, then they Sign in with Google once.

## 1. Create a Supabase project

[supabase.com/dashboard](https://supabase.com/dashboard) → New project (free tier). Wait until it is provisioned. **One** project for both apps.

Recommended security toggles on create:

- **Enable Data API** — on
- **Automatically expose new tables** — off
- **Enable automatic RLS** — on

## 2. Copy keys into `.env.local`

**Project Settings → API** (or Connect → Framework → Next.js → `.env.local`):

- **Project URL / API URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public / publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same value; use this env name)
- **service_role / secret** → `SUPABASE_SERVICE_ROLE_KEY` (scripts/server only; never commit)

Copy from `.env.example` into **both** repos' `.env.local` using the **same** URL and keys. Local OAuth return is **`SITE_URL`** (server-only, not `NEXT_PUBLIC_`):

```bash
SITE_URL=http://localhost:3000
```

If both apps run locally at once, give one a different port and matching `SITE_URL`. Add **both** origins to Google JS origins and Supabase Redirect URLs (`http://localhost:3000/auth/callback` and the other port's callback). One Supabase Auth callback: `https://<project-ref>.supabase.co/auth/v1/callback`.

`DATABASE_URL` is for rate limiting later (pooler URI from Connect → **Direct** → **Transaction pooler** → URI). Skip until that subplan.

## 3. Google Cloud Client ID and secret (OAuth 2.0, free)

This is **Google OAuth 2.0** (OpenID Connect). You create a Web client; Supabase Auth uses it for "Sign in with Google." Skip billing prompts. Scopes are only `openid`, `email`, `profile`.

In [Google Cloud Console](https://console.cloud.google.com/) / [Google Auth Platform](https://console.cloud.google.com/auth/overview):

1. Configure the consent screen (**External**). On **Audience**, stay in **Testing** and add your Gmail as a **test user**.
2. **Clients** → Create client → **Web application**.
3. Origins: `http://localhost:3000` (add the other local port and the Vercel / live origin when you have them).
4. Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (exact, or `redirect_uri_mismatch`). One callback for the shared project. Do **not** paste a `postgresql://` string here.
5. Save **Client ID** and **Client Secret** (no need to download the JSON).

## 4. Supabase Auth

- **Authentication → Sign In / Providers → Google:** on; paste Client ID and secret (replace any placeholder text in Client IDs).
- **Providers → Email:** signups **off**. Other OAuth **off**.
- **URL Configuration:** Site URL `http://localhost:3000`; Redirect URLs include both apps' `/auth/callback` URLs (and live URLs when you have them). The Next.js callback route is added in the frontend wiring subplan.
- **Hooks:** after you have run `docs/install/schema.sql` **once**, attach `hook_before_user_created` as **Before User Created**. The SQL function does nothing until this is connected.

## 5. Run the schema (paste once)

Open either repo's `docs/install/schema.sql` (identical). Paste **once** into the shared project's SQL Editor → Run. Do not run it twice (second run would error on existing objects).

## 6. Allow your admin email

From either repo (same service role, same allowlist):

```bash
npm install
npm run allow-admin -- you@gmail.com
```

Needs `SUPABASE_SERVICE_ROLE_KEY` in that `.env.local`. Visitors cannot add emails.

## 7. Where each variable lives

GitHub and Vercel do **not** share secrets. Copy only what each host actually runs.

**`NEXT_PUBLIC_` prefix:** keep it on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Drop it everywhere else. `SITE_URL`, `DATABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are **server-only** — never `NEXT_PUBLIC_`.

**Local `.env.local` (both repos, gitignored) — everything you need to develop:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — `npm run allow-admin` only
- `SITE_URL` — `http://localhost:3000` (or the other local port)
- `DATABASE_URL` — after rate-limiting work (pooler URI)

**GitHub repo Settings → Secrets (Actions) — keep-alive only:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do **not** put on GitHub: `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `DATABASE_URL`.

**Vercel Project Settings → Environment Variables — the deployed app:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SITE_URL` — live `https://` origin (Vercel URL or custom domain), not localhost
- `DATABASE_URL` — after rate-limiting work

Do **not** put on Vercel: `SUPABASE_SERVICE_ROLE_KEY` (unless you later add a server path that needs it). Linked GitHub does not copy Actions secrets into Vercel.

`.env.example` lists all five with those comments.

## 8. Keep-alive (GitHub Actions)

Workflow: `.github/workflows/supabase-keep-alive.yml` in each repo. Set the two GitHub secrets above. Daily cron `15 12 * * *` + `workflow_dispatch`. Real table read on `comments_public`, not `/auth/v1/health`.

- Does not unpause an already-paused project (restore in Dashboard first).
- GitHub may disable scheduled workflows after ~60 days with no repo activity.

## 9. Vercel (linked GitHub)

For each Vercel project, set the **Vercel** list from section 7. Also add the live origin to Google JS origins and Supabase Redirect URLs (`https://<your-domain>/auth/callback`). Preview deployments need their own origin/callback if you sign in there.

`.env.local` never reaches Vercel. After changing Vercel env vars, redeploy.

## Template note

After packages are in `package.json`, anyone cloning the template only runs `npm install`, creates their own Supabase project, and fills `.env.local`. They do **not** recreate `lib/supabase/`.
