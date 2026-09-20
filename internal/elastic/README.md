# Local Elasticsearch Demo

## 1. Start Docker

Start Docker Desktop, then in a new terminal confirm that Docker is running a Server with ` OS/Arch: linux/amd64`:

```bash
docker version
```

## 2. Start Elasticsearch

From the guestbook repo root, call:

```bash
docker compose -f docker-compose.es.yml up -d
```

Elasticsearch needs a few seconds before port `9200` answers — wait about 30 seconds, then confirm using the admin login (username: `elastic` / password: `password`) that Elasticsearch is running:

```bash
curl -s -u elastic:password http://127.0.0.1:9200
```

- Ready looks like a chunk of JSON — if you get `401`, the process is up but the password does not match. 
- If `curl` returns nothing, it is still starting — wait and run the same command again.

## 3. Stop Demo

Turn Elasticsearch off but keep what is already indexed (synced docs). Next `up -d` will still have that data:

```bash
docker compose -f docker-compose.es.yml down
```

Turn iElasticsearch off and erase saved data. Next `up -d` starts empty:

```bash
docker compose -f docker-compose.es.yml down -v
```

## Reference

### Generate Elastic API Key

`up -d` / `down` uses the `ELASTIC_API_KEY` saved in `.env.local`. You'll only need to create a new key if `down -v` was run (wiping the saved data), or if the key was deleted.

```bash
curl -s -u elastic:password -H "Content-Type: application/json" \
-X POST http://127.0.0.1:9200/_security/api_key \
-d "{\"name\":\"guestbook-docs\"}"
```

### Sync Docs

Indexes the documentation MDX files from a remote Git branch into local Elasticsearch (default `main`):

```bash
npm run sync-docs
# Example branch `elastibot`
BRANCH=elastibot npm run sync-docs
```





