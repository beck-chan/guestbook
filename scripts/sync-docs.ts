import { config } from "dotenv";

config({ path: ".env.local" });

import { elasticClient } from "../src/lib/docs/elastic";
import { indexDocsCorpus } from "./lib/index-docs-corpus";

async function main() {
  const elasticUrl = process.env.ELASTIC_URL?.trim();
  const elasticKey = process.env.ELASTIC_API_KEY?.trim();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!elasticUrl || !elasticKey || !geminiKey) {
    console.error(
      "Missing ELASTIC_URL, ELASTIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    );
    process.exit(1);
  }

  await indexDocsCorpus({
    client: elasticClient(),
    targetUrl: elasticUrl,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
