# Guestbook agent notes

Docs are MDX (`src/app/docs/**/*.mdx`) compiled by Next. Do not glob `node_modules` or `.next` to “set up” Next.

If a Next 16 API is unfamiliar, Read **one** file under `node_modules/next/dist/docs/` (start from that folder’s index). Never glob `**/*.md` there.

Do not start `next dev` if port 3000 is already taken. Stop or restart with `npm run dev:stop` so leftover previews and the `.next` cache are cleared. Closing a browser preview does **not** stop the process.

For browser checks, wait for `domcontentloaded` or a selector — not `networkidle0`. This app keeps POSTing comments, so network idle often never arrives.
