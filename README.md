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

## Feature flags

Flags are compile-time values in [`lib/flags.ts`](lib/flags.ts). Override them with env vars, then restart `npm run dev` or run `npm run build` again. Unset vars use the defaults in `lib/flags.ts`.

| Env var | Flag | Default | Effect |
| --- | --- | --- | --- |
| `FLAG_DOCS` | `docs` | `true` | Desk bookmarks: **view docs** plus a short **admin login** ribbon. Off: the labeled bookmark is **admin login** only. |
| `FLAG_COUNTER` | `hitCounter` | `true` | Hit-counter on the home cover, guestbook page, and comment sidebar. |
| `FLAG_PUBLIC` | `public` | `false` | Public guestbook home (rewrite `/` to `/guestbook`), dark green favicon, `y2k-guestbook` GitHub links. |

Accepted values are `true` / `1` and `false` / `0`. When `docs` is on, `docsUrl` in the same file sets the docs href (default `/docs`).

A second Vercel project can deploy the same `main` branch with different `FLAG_*` values (set as that project's environment variables). Local [`.env`](.env) is gitignored and does not affect Vercel.

To add another flag, add a key on `flags` in [`lib/flags.ts`](lib/flags.ts), pass the env name through `env` in [`next.config.ts`](next.config.ts), and branch on it in the UI.

## Stop a running preview

`npm run dev` listens on port 3000. In Git Bash, check whether anything is already bound to that port:

```bash
netstat -ano | grep :3000
```

The last column is the PID. Stop it:

```bash
taskkill //F //PID {id}
```
