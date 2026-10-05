import { config } from "dotenv";
import { elasticCloudClient, isKibanaUiUrl } from "../src/lib/docs/elastic";
import { indexDocsCorpus } from "./lib/index-docs-corpus";

config({ path: ".env.local" });

async function main() {
  const cloudUrl = process.env.ELASTIC_CLOUD_URL?.trim();
  const cloudKey = process.env.ELASTIC_CLOUD_API_KEY?.trim();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!cloudUrl || !cloudKey || !geminiKey) {
    console.error(
      "Missing ELASTIC_CLOUD_URL, ELASTIC_CLOUD_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    );
    process.exit(1);
  }

  if (isKibanaUiUrl(cloudUrl)) {
    console.error(
      "ELASTIC_CLOUD_URL must be the Elasticsearch address (the Cloud .es. host), not the Kibana website.",
    );
    process.exit(1);
  }

  const client = elasticCloudClient();
  if (!client) {
    console.error(
      "Could not create a client from ELASTIC_CLOUD_URL / ELASTIC_CLOUD_API_KEY.",
    );
    process.exit(1);
  }

  await indexDocsCorpus({
    client,
    targetUrl: cloudUrl,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
