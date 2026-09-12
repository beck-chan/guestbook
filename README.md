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

## Editor (tsserver)

These only affect Cursor/VS Code IntelliSense, not `npm run docs` / `npm run dev`.

- [`tsconfig.json`](tsconfig.json) comments out `"src/**/*.mdx"` in `include` so tsserver does not load docs MDX. Uncomment that line when you want docs autocomplete (`mdx.server.enable`).
- [`.vscode/settings.json`](.vscode/settings.json) sets `mdx.server.enable` to `false` (docs autocomplete off; Next still compiles MDX) and `typescript.disableAutomaticTypeAcquisition` so tsserver does not download `@types` packages in the background.

If a Cursor chat still behaves like the parent `beck-chan` folder, the window was opened on that parent, not on `guestbook/`. Opening a guestbook file does not change the workspace root — use **File → Open Folder** on this repo.

## Feature flags

Flags are compile-time values in [`src/lib/flags.ts`](src/lib/flags.ts). Override them with env vars, then restart `npm run dev` or run `npm run build` again. Unset vars use the defaults in `src/lib/flags.ts`.

| Env var | Flag | Default | Effect |
| --- | --- | --- | --- |
| `FLAG_DOCS` | `docs` | `true` | Desk bookmarks: **view docs** plus a short **admin login** ribbon. Off: the labeled bookmark is **admin login** only. |
| `FLAG_DOCSONLY` | `docsOnly` | `false` | Serve only `/docs` (redirect desk, guestbook, and admin URLs). Skip the settings fetch and guestbook theme/admin overlay. Wins over `FLAG_PUBLIC`. `npm run docs` sets this for that process (overrides `.env.local`). Local preview only — do not set on Vercel. |
| `FLAG_COUNTER` | `hitCounter` | `true` | Hit-counter on the home cover, guestbook page, and comment sidebar. |
| `FLAG_COUNTER_URL` | `hitCounterUrl` | *(empty)* | Comma-separated guestbook paths/URLs for unique visitors (e.g. `/guestbook,/`). Paths match `$pathname` exactly; full URLs match `$current_url`. Empty counts all `$pageview` events. |
| `FLAG_PUBLIC` | `public` | `false` | Public guestbook home (rewrite `/` to `/guestbook`), dark green favicon, `y2k-guestbook` GitHub links. |
| `FLAG_APITEST` | `apiTest` | `false` | Show Scalar **Test Request** on the private API docs (`FLAG_PUBLIC=false`). Uses `NEXT_PUBLIC_SUPABASE_URL`. Public docs already show Test Request. |
| `FLAG_NOTIF` | `notif` | `false` | Next/docs copy only. Admin notification emails send only when the **Supabase secret** `FLAG_NOTIF` is also `true` (see `supabase/functions/README.md` and `/docs/notifs`). |

Accepted values are `true` / `1` and `false` / `0`. When `docs` is on, `docsUrl` in the same file sets the docs href (default `/docs`).

A second Vercel project can deploy the same `main` branch with different `FLAG_*` values (set as that project's environment variables). Local [`.env`](.env) is gitignored and does not affect Vercel.

To add another flag, add a key on `flags` in [`src/lib/flags.ts`](src/lib/flags.ts), pass the env name through `env` in [`next.config.ts`](next.config.ts), and branch on it in the UI.

Public docs (`FLAG_PUBLIC=true`) fetch the API catalog from `API_PUBLIC_URL` using `API_SERVICE_ROLE_KEY` (also set `API_ANON_KEY`). Private docs fetch from `NEXT_PUBLIC_SUPABASE_URL` using `SUPABASE_SERVICE_ROLE_KEY`. Visitors still enter their own project ID for Test Request on the public build.


# NOTE TO SELF

- how to change hardcoded display name and email limits
- what RLS did we implement
- DON'T FORGET TO REWRITE Y2K-GUESTBOOK HISTORY EXPOSED TOKENS IN .ENV

## kill command why

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

try book flipping again, then remove check-book-scroll.mjs




