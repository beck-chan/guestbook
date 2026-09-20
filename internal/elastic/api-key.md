# Generate Elastic API Key

`up -d` / `down` uses the `ELASTIC_API_KEY` saved in `.env.local`. You'll only need to create a new key if `down -v` was run (wiping the saved data), or if the key was deleted.

```bash
curl -s -u elastic:password -H "Content-Type: application/json" \
-X POST http://127.0.0.1:9200/_security/api_key \
-d "{\"name\":\"guestbook-docs\"}"
```

