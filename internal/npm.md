## Build

```bash
npm run build
npm run start
```

## Linter

```bash
npm run lint
npm run lint:a11y
npm run lint:a11y-docs
```

## Versioning

```bash
npm version patch
npm version minor
npm version major
```

## Admin User

```bash
npm run allow-admin -- example@gmail.com
npm run delete-admin -- example@gmail.com
```

## Deploy Edge Functions

```bash
npx supabase functions deploy notify-admins on-user-created --project-ref yahduqsmchkyapakpvdh --use-api
```

## Sync Docs

[`scripts/sync-docs.ts`](/scripts/sync-docs.ts) uses the API key to index our MDX documentation for our chatbot to search:

```bash
npm run sync-docs
```

To index from a specific branch:

```bash
# Example branch `supabot`
BRANCH=supabot npm run sync-docs
```

- Chunk text is hashed locally in `internal/elastic/embed-cache.json` (gitignored). 
- Unchanged chunks are not sent to Gemini again. The first run still embeds everything — later syncs only pay for edits.

## Cucumber

```bash
npx cucumber-js 
```