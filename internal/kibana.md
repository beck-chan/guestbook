# Local Kibana Demo

`FLAG_KIBANA` in `.env.local` chooses which Elasticsearch the docs chatbot searches:

- Unset or `false` — Chatbot uses `ELASTIC_URL` / `ELASTIC_API_KEY` (port `9200`). Refer to [`internal/elasticsearch.md`](/internal/elasticsearch.md).
- `true` — Chatbot uses `KIBANA_URL` / `KIBANA_API_KEY` (port `9201`). Missing `KIBANA_*` (or a URL on `:5601`) fails closed — chat does not fall back to port `9200`.

<!-- `KIBANA_URL` is this stack's Elasticsearch HTTP URL (`http://127.0.0.1:9201`), not the Kibana UI (`http://127.0.0.1:5601`). `npm run sync-docs-kb` and chat copies talk to Elasticsearch.  -->

## 1. Start Docker

Start Docker Desktop, then in a new terminal confirm that Docker is running a Server with `OS/Arch: linux/amd64`:

```bash
docker version
```

## 2. Start Elasticsearch + Kibana

From the guestbook repo root, call:

```bash
# Start inspect Elasticsearch + Kibana with the `elastic` / `password` login
docker compose -f docker-compose.kb.yml up -d
```

<!-- You can leave `docker-compose.es.yml` running. This stack uses `127.0.0.1:9201` (Elasticsearch) and `127.0.0.1:5601` (Kibana UI). The chatbot stays on port `9200` unless `FLAG_KIBANA=true` in `.env.local` (see Reference). -->

Elasticsearch needs a few seconds before port `9201` answers — wait about 30 seconds, then confirm using the admin login (username: `elastic` / password: `password`):

```bash
curl -s -u elastic:password http://127.0.0.1:9201
```

- Ready looks like a chunk of JSON — if you get `401`, the process is up but the password does not match.
- If `curl` returns nothing, it is still starting — wait and run the same command again.

Open the Kibana UI and log in as `elastic` / `password`:

```
http://127.0.0.1:5601
```

To review data: Left sidebar > Analytics > **Discover** > **Data view** / **Try ES|QL**:

```sql
-- Docs index sync
FROM guestbook-docs
| KEEP title, heading, href, public
| LIMIT 200
```

```sql
-- Conversation turn history
FROM guestbook-chat
| KEEP role, content, session_id, created_at
| SORT created_at DESC
| LIMIT 200
```

## 3. Stop Demo

Turn Kibana off but keep what is already indexed (synced docs and chat copies). Next `up -d` will still have that data:

```bash
docker compose -f docker-compose.kb.yml down
```

Turn Kibana off and erase saved data. Next `up -d` starts empty:

```bash
docker compose -f docker-compose.kb.yml down -v
```

<!-- After `down -v`, reset `kibana_system`, mint a new `KIBANA_API_KEY`, and run `npm run sync-docs-kb` again. Leave `ELASTIC_API_KEY` alone. -->

## Reference

### `kibana_system` password

Kibana logs in as `kibana_system`. After the first Docker build, or after `down -v`, set that password to match Compose (`password`):

```bash
curl -s -u elastic:password -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:9201/_security/user/kibana_system/_password \
  -d "{\"password\":\"password\"}"
```

### Generate Kibana API key

Create a key after the first Docker build, after using `down -v` (wiping the saved data), or if the key was deleted:

```bash
curl -s -u elastic:password -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:9201/_security/api_key \
  -d "{\"name\":\"guestbook-docs-kb\"}"
```

1. Copy the `encoded` field into `.env.local` as `KIBANA_API_KEY` (keep `KIBANA_URL=http://127.0.0.1:9201`).
2. Restart `npm run docs` if it was already running so it picks up the `.env` change.

### Sync Docs

[`scripts/sync-docs-kb.ts`](/scripts/sync-docs-kb.ts) uses `KIBANA_URL` / `KIBANA_API_KEY` to index MDX into this contatiner's `guestbook-docs`.

```bash
npm run sync-docs-kb
```

To index from a specific branch:

```bash
# Example branch `elastibot`
BRANCH=elastibot npm run sync-docs-kb
```

- Chunk text is hashed locally in `internal/elastic/embed-cache.json` (gitignored), shared with `npm run sync-docs`.
- Unchanged chunks are not sent to Gemini again. You still bulk into port `9201`.
<!-- - Keep `sync-docs` for port `9200`. If the flag is on, do not index with `sync-docs` — that still writes 9200 while the bubble reads 9201. -->

### Chat History Copy

Each chat conversation turn is copied into `guestbook-chat` on port `9201`:

- The chatbot loads and saves threads in Supabase as the source of truth — what's displayed in Kibana is only a copy.
- Missing `KIBANA_*` skips the copy. With `FLAG_KIBANA` off, the bubble still searches port `9200`. With the flag on, missing `KIBANA_*` also fails search (no fallback to 9200).
- **Clear Chat** removes that session from Supabase and copy from `guestbook-chat`.

To confirm Kibana is capturing data:

```bash
curl -s -u elastic:password "http://127.0.0.1:9201/_cat/indices/guestbook-*?v"
curl -s -u elastic:password "http://127.0.0.1:9201/guestbook-docs/_count"
curl -s -u elastic:password "http://127.0.0.1:9201/guestbook-chat/_count"
```

### Create Kibana Views

Left sidebar > Management > **Stack Management** > Kibana > **Data Views** > **Create data view** (**Save data view to Kibana**):

#### a. Docs Index

- **Name:** `guestbook-docs`
- **Index pattern:** `guestbook-docs`

<!-- 1. **Discover** on `guestbook-docs` — one hit per heading chunk (`title`, `heading`, `href`, `body`, `public`). Filter `public: true` the way chat does when `FLAG_PUBLIC` is on. Keyword search in the bar is BM25 only (the lexical half of [`lexicalQuery`](/src/app/docs/chat/route.ts)).
2. **Stack Management → Index Management → mappings** — English analyzer on `title` / `heading` / `body`; `embedding` is `dense_vector` cosine 768 from [`scripts/sync-docs.ts`](/scripts/sync-docs.ts).
3. **Dev Tools** — replay the two searches chat runs in parallel: `multi_match` on title/heading/body, and `knn` on `embedding` (kNN needs a 768-float `query_vector` from Gemini `RETRIEVAL_QUERY`; paste from [`internal/elastic/query-embed-cache.json`](/internal/elastic/query-embed-cache.json) if present). Compare the two hit lists — that is what Node RRF merges. Kibana will not apply `pickRelevantGuides` unless you read the snapshot on the chat document.
4. Optional **Lens**: count chunks by `section` or `public`. -->

#### b. Chat History

- **Name:** `guestbook-chat`
- **Index pattern:** `guestbook-chat`
- **Timestamp field:** `created_at`

<!-- 5. **Discover** on `guestbook-chat` — filter `role: user` / `role: assistant`. Assistant `content` is the Summary text; `sources` is Relevant Guides. The retrieval snapshot is the less-manual compare (picked vs lexical/knn).
6. **Clear Chat** in the bubble removes that `session_id` from both Supabase and `guestbook-chat` (best-effort).

Practical loop with `FLAG_KIBANA=true`: `kb.yml` up; `npm run sync-docs-kb`; ask the bubble (9201); Discover `guestbook-docs` and `guestbook-chat` in Kibana. You do not need `es.yml`. With the flag off, the bubble stays on 9200; Kibana only sees the last `sync-docs-kb` and any chat copies on 9201. -->


### Create Visualizations

Left sidebar > Analytics > **Visualize Library** > **Create new visualization** > **Lens**

### Dev Tools

Left sidebar > Management > **Dev Tools**:

```bash
# Word search
GET guestbook-docs/_search
{
  "size": 20,
  "_source": ["href", "title", "heading", "body"],
  "query": {
    "multi_match": {
      "query": "rate limit",
      "type": "best_fields",
      "fields": ["title^5", "heading^3", "body"]
    }
  }
}
```





