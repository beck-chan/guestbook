# Elastic Cloud Kibana

Docs chat always searches Elastic Cloud. It reads `ELASTIC_CLOUD_URL` and `ELASTIC_CLOUD_API_KEY`. There is no fallback to the local port `9200` stack (`ELASTIC_URL` / `ELASTIC_API_KEY`, `npm run sync-docs`).

`ELASTIC_CLOUD_URL` is the deployment's Elasticsearch endpoint (`https://….es.….elastic.cloud`), not the Kibana website (`https://….kb.….elastic.cloud`). Sync and chat copies talk to Elasticsearch. You open the `.kb.` address in a browser to inspect the data.

Create the deployment on Elasticsearch **8.19.x** so it matches `@elastic/elasticsearch` 8.19.2.

## 1. Copy the Elasticsearch endpoint

On the deployment page at cloud.elastic.co, copy **Elasticsearch** → **Endpoint** into `.env.local`:

```
ELASTIC_CLOUD_URL=https://<deployment>.es.<region>.<cloud>.elastic.cloud
```

Leave the Kibana endpoint for the browser. A host containing `.kb.` is refused.

## 2. Create the API key

`ELASTIC_CLOUD_API_KEY` is not on the deployment page. The `elastic` user password under **Security** → **Reset password** is not the API key either. Skip **Organization** → **API keys** on cloud.elastic.co — that key manages deployments and cannot search indexes.

1. Open Kibana from the deployment and log in as `elastic`.
2. Go to **Stack Management** → **Security** → **API keys** → **Create API key**.
3. Name it `guestbook-docs`. Leave the default privileges so it can create, write, delete, and search `guestbook-docs` and `guestbook-chat`.
4. Copy **encoded** once. Kibana does not show it again.

```
ELASTIC_CLOUD_API_KEY=<encoded>
```

Restart `npm run docs` if it was already running so it picks up the `.env` change.

For a deployed docs chat, set the same two variables in Vercel and redeploy. Next inlines them at build time. Mark `ELASTIC_CLOUD_API_KEY` Sensitive. Leave `ELASTIC_URL` and `ELASTIC_API_KEY` unset on Vercel.

## 3. Sync docs

[`scripts/sync-docs-kb.ts`](/scripts/sync-docs-kb.ts) uses `ELASTIC_CLOUD_URL` / `ELASTIC_CLOUD_API_KEY` to index MDX into this deployment's `guestbook-docs`. It reads `.env.local`, not Vercel.

```bash
npm run sync-docs-kb
```

To index from a specific branch:

```bash
# Example branch `elastibot`
BRANCH=elastibot npm run sync-docs-kb
```

- Chunk text is hashed locally in `internal/elastic/embed-cache.json` (gitignored), shared with `npm run sync-docs`.
- Unchanged chunks are not sent to Gemini again. The bulk write still goes to Cloud.
- `npm run sync-docs` still writes the local port `9200` cluster. Docs chat does not read that cluster.

## 4. Inspect in Kibana

Open the Kibana endpoint from the deployment page (the host contains `.kb.`).

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

## Reference

### Chat history copy

Each chat conversation turn is copied into `guestbook-chat` on this deployment:

- The chatbot loads and saves threads in Supabase as the source of truth. What Kibana shows is a copy.
- Missing `ELASTIC_CLOUD_*` skips the copy. Search fails closed instead of falling back to port `9200`.
- **Clear Chat** removes that session from Supabase and the copy from `guestbook-chat`.

### Create Kibana views

Left sidebar > Management > **Stack Management** > Kibana > **Data Views** > **Create data view** (**Save data view to Kibana**):

#### a. Docs index

- **Name:** `guestbook-docs`
- **Index pattern:** `guestbook-docs`

#### b. Chat history

- **Name:** `guestbook-chat`
- **Index pattern:** `guestbook-chat`
- **Timestamp field:** `created_at`

### Create visualizations

Left sidebar > Analytics > **Visualize Library** > **Create new visualization** > **Lens**

### Dev Tools

Left sidebar > Management > **Dev Tools**:

```
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
