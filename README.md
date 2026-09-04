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

Flags are compile-time values in [`lib/flags.ts`](lib/flags.ts). Change a flag, then restart `npm run dev` or run `npm run build` again.

`docs` (default `false`) controls the desk bookmarks on the home and guestbook pages:

- **Off:** the labeled bookmark is **admin login** and goes to `/admin`. The short admin ribbon is hidden.
- **On:** the labeled bookmark is **view docs** and the short **admin login** ribbon is shown. Docs open in a new window.

When `docs` is on, `docsUrl` in the same file sets the docs href (default `/docs`).

`hitCounter` (default `true`) shows or hides the hit-counter display on the home cover, guestbook page, and comment sidebar.

To add another flag, add a key on `flags` in [`lib/flags.ts`](lib/flags.ts) and branch on it in the UI.

## Stop a running preview

`npm run dev` listens on port 3000. In Git Bash, check whether anything is already bound to that port:

```bash
netstat -ano | grep :3000
```

The last column is the PID. Stop it:

```bash
taskkill //F //PID {id}
```
