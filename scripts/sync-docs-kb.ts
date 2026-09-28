import { config } from "dotenv";

config({ path: ".env.local" });

import { kibanaStackClient } from "../src/lib/docs/elastic";
import { indexDocsCorpus } from "./lib/index-docs-corpus";

function isKibanaUiUrl(url: string) {
  try {
    return new URL(url).port === "5601";
  } catch {
    return false;
  }
}

async function main() {
  const kibanaUrl = process.env.KIBANA_URL?.trim();
  const kibanaKey = process.env.KIBANA_API_KEY?.trim();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!kibanaUrl || !kibanaKey || !geminiKey) {
    console.error(
      "Missing KIBANA_URL, KIBANA_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    );
    process.exit(1);
  }

  if (isKibanaUiUrl(kibanaUrl)) {
    console.error(
      "KIBANA_URL must be the inspect Elasticsearch HTTP URL (port 9201), not the Kibana UI (port 5601).",
    );
    process.exit(1);
  }

  const client = kibanaStackClient();
  if (!client) {
    console.error("Could not create a client from KIBANA_URL / KIBANA_API_KEY.");
    process.exit(1);
  }

  await indexDocsCorpus({
    client,
    targetUrl: kibanaUrl,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
