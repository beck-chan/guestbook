# Original Poetry

A Next.js guestbook: a closed book of original poems that opens into a two-page spread, with a sticky-note guestbook beside it.

Poems are markdown files in [`poetry/`](poetry/).

## Prerequisites

- **Node.js 20 LTS or 22 LTS** (includes `npm`). Next.js 16 needs Node 18.18+; 20+ is the safer default.
- Check: `node -v` and `npm -v`
- Install from [nodejs.org](https://nodejs.org), or use `nvm` / `fnm`

## Install

From the repository root:

```bash
npm install
```

## Test

There is no unit-test suite. From the repository root:

```bash
npm run lint
npm run build
```

`lint` runs ESLint. `build` type-checks and compiles the Next.js app. Both should exit 0.

Smoke-test the UI with the dev server (`npm run dev` below): closed book → **Open Book** → left-page Easter egg, right-page poem → **Turn Page** → **Close Book**.

## Build

From the repository root:

```bash
npm run build
```

Output goes to `.next/`.

Run the production build locally:

```bash
npm run start
```

Open [http://localhost:3000](http://localhost:3000).

## Preview locally

From the repository root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Docs-only preview (same as `FLAG_DOCSONLY=true`, without editing `.env.local`):

```bash
npm run docs
```

`http://localhost:3000` then serves `/docs`. Stop with `npm run dev:stop`, then `npm run dev` for the poetry desk.

## Feature flags

Flags are compile-time values in [`src/lib/flags.ts`](src/lib/flags.ts). Override them with env vars, then restart `npm run dev` or run `npm run build` again. Unset vars use the defaults in `src/lib/flags.ts`.

| Env var | Flag | Default | Effect |
| --- | --- | --- | --- |
| `FLAG_DOCS` | `docs` | `true` | Desk bookmarks: **view docs** plus a short **admin login** ribbon. Off: the labeled bookmark is **admin login** only. |
| `FLAG_DOCSONLY` | `docsOnly` | `false` | Serve only `/docs` (redirect desk, guestbook, and admin URLs). Skip the settings fetch and guestbook theme/admin overlay. Wins over `FLAG_PUBLIC`. `npm run docs` sets this for that process (overrides `.env.local`). Local preview only — do not set on Vercel. |
| `FLAG_COUNTER` | `hitCounter` | `true` | Hit-counter on the home cover, guestbook page, and comment sidebar. |
| `FLAG_COUNTER_URL` | `hitCounterUrl` | *(empty)* | Comma-separated guestbook paths/URLs for unique visitors (e.g. `/guestbook,/`). Paths match `$pathname` exactly; full URLs match `$current_url`. Empty counts all `$pageview` events. |
| `FLAG_PUBLIC` | `public` | `false` | Public guestbook home (rewrite `/` to `/guestbook`), dark green favicon, `y2k-guestbook` GitHub links. |

Accepted values are `true` / `1` and `false` / `0`. When `docs` is on, `docsUrl` in the same file sets the docs href (default `/docs`).

A second Vercel project can deploy the same `main` branch with different `FLAG_*` values (set as that project's environment variables). Local [`.env`](.env) is gitignored and does not affect Vercel.

To add another flag, add a key on `flags` in [`src/lib/flags.ts`](src/lib/flags.ts), pass the env name through `env` in [`next.config.ts`](next.config.ts), and branch on it in the UI.

## Stop a running preview


```bash
npm run dev:stop
```

It’s the “actually quit the local website” command.

When you (or an agent) run npm run dev, Next starts a server on port 3000. Closing the preview tab or the browser does not stop that server. It keeps running in the background, holding files open and using memory.

npm run dev:stop does two things:

Stops that server — whatever is still sitting on ports 3000/3001.
Deletes the .next folder — Next’s leftover build cache, so it doesn’t sit there growing while nothing is running.
Use it when you’re done looking at the app and don’t want that background process left on. Next time you want the site, run npm run dev again.

(not ctrl+c)

`npm run dev` listens on port 3000. In Git Bash, check whether anything is already bound to that port:

```bash
netstat -ano | grep :3000
```

The last column is the PID. Stop it:

```bash
taskkill //F //PID {id}
```

kill all:

```bash
taskkill //F //IM node.exe
```


# NOTE TO SELF

don't forgor to 

Optional: rewrite history (git filter-repo / BFG) and force-push to scrub the old blob — still rotate first; assume the secrets were already copied.

remove docs install later

## api gen ref

```bash
npx supabase login
npx supabase gen types typescript --project-id yahduqsmchkyapakpvdh --schema public > src/app/docs/api/database.types.ts
```

If you prefer a token instead of npx supabase login: Dashboard → Account → Access Tokens, then:

```bash
export SUPABASE_ACCESS_TOKEN=your_token
npx supabase gen types typescript --project-id yahduqsmchkyapakpvdh --schema public > src/app/docs/api/database.types.ts
```

need to do this for public docs too


Display name: 128 characters
Email: 254 characters (the usual max for an email address)

To keep a change:

Open Configure and tweak theme/layout/options.
Copy the JSON snippet in that panel.
Paste the keys you want into the createApiReference config in src/app/docs/_components/DocsApiReferenceView.tsx (scalarConfig). If you still use the iframe explorer, copy the same keys into src/app/docs/api/explorer/route.ts.
Refresh /docs/api.

