# Original Poetry

A Next.js volume that opens a closed book titled **Original Poetry**. Pick up the fountain pen labelled **Open Book** to open a flat two-page spread.

## Prerequisites

You only need a current Node.js toolchain. Next.js, React, and TypeScript are project dependencies — do not install them globally.

1. **Node.js 20 LTS or 22 LTS** (includes `npm`). Next.js 15+ requires Node 18.18+; 20+ is the safer default.
   - Check: `node -v` and `npm -v`
   - Install from [https://nodejs.org](https://nodejs.org), or use a version manager such as `nvm` or `fnm`

## Dependencies

This is a Node.js app, not a Python project. Do **not** add `pyproject.toml` or `poetry.lock`.

- [`package.json`](package.json) — declared dependencies and npm scripts
- [`package-lock.json`](package-lock.json) — exact resolved versions (commit this so installs stay reproducible)

`npm install` in this directory restores the tree.

## Install

From the repository root:

```bash
cd volume
npm install
```

## Preview locally

Development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see a closed book titled **Original Poetry** by Beck Chan and a fountain pen labelled **Open Book**. Clicking the pen opens a two-page spread: an Easter egg note on the left, and a random poem on the right. The dog-ear labelled **Turn Page** shows another poem (never the same one twice in a row). The pen then reads **Close Book**.

## Production preview

```bash
npm run build
npm run start
```

Same URL: [http://localhost:3000](http://localhost:3000).
