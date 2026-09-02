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
