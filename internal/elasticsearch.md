# Local Elasticsearch Demo

## 1. Start Docker

Start Docker Desktop, then in a new terminal confirm that Docker is running a Server with `OS/Arch: linux/amd64`:

```bash
docker version
```

## 2. Start Elasticsearch

From the guestbook repo root, call:

```bash
# Start Elasticsearch with the `elastic` / `password` login
docker compose -f docker-compose.es.yml up -d
```

Elasticsearch needs a few seconds before port `9200` answers — wait about 30 seconds, then confirm using the admin login (username: `elastic` / password: `password`) that Elasticsearch is running:

```bash
curl -s -u elastic:password http://127.0.0.1:9200
```

- Ready looks like a chunk of JSON — if you get `401`, the process is up but the password does not match. 
- If `curl` returns nothing, it is still starting — wait and run the same command again.

Serve just the docs to access the chatbot:

```bash
npm run docs
```

## 3. Stop Demo

Turn Elasticsearch off but keep what is already indexed (synced docs). Next `up -d` will still have that data:

```bash
docker compose -f docker-compose.es.yml down
```

Turn Elasticsearch off and erase saved data. Next `up -d` starts empty:

```bash
docker compose -f docker-compose.es.yml down -v
```

## Reference

**Send** posts to `src/app/docs/chat/route.ts`, which needs `ELASTIC_URL` and `ELASTIC_API_KEY` to search the documentation synced Elasticsearch index. 

### Generate Elastic API Key

Create a key after the first Docker build, after using `down -v` (wiping the saved data), or if the key was deleted:

```bash
curl -s -u elastic:password -H "Content-Type: application/json" \
-X POST http://127.0.0.1:9200/_security/api_key \
-d "{\"name\":\"guestbook-docs\"}"
```

1. Copy the `encoded` field into `.env.local` as `ELASTIC_API_KEY` (keep `ELASTIC_URL=http://127.0.0.1:9200`). 
2. Restart `npm run docs` if it was already running so it picks up the `.env` change.

### Sync Docs

[`scripts/sync-docs.ts`](/scripts/sync-docs.ts) uses the API key to index our MDX documentation into Elasticsearch:

```bash
npm run sync-docs
```

To index from a specific branch:

```bash
# Example branch `elastibot`
BRANCH=elastibot npm run sync-docs
```

- Chunk text is hashed locally in `internal/elastic/embed-cache.json` (gitignored). 
- Unchanged chunks are not sent to Gemini again. The first run still embeds everything — later syncs only pay for edits.



