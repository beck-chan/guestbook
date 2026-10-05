import { Client } from "@elastic/elasticsearch";

export const DOCS_INDEX = "guestbook-docs";
export const CHAT_INDEX = "guestbook-chat";

export function elasticClient() {
  const node = process.env.ELASTIC_URL?.trim();
  const apiKey = process.env.ELASTIC_API_KEY?.trim();
  if (!node || !apiKey) {
    throw new Error("Missing ELASTIC_URL or ELASTIC_API_KEY");
  }
  return new Client({ node, auth: { apiKey } });
}

export function isKibanaUiUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.port === "5601") return true;
    return parsed.hostname.toLowerCase().split(".").includes("kb");
  } catch {
    return true;
  }
}

export function elasticCloudClient() {
  const node = process.env.ELASTIC_CLOUD_URL?.trim();
  const apiKey = process.env.ELASTIC_CLOUD_API_KEY?.trim();
  if (!node || !apiKey || isKibanaUiUrl(node)) {
    return null;
  }
  return new Client({ node, auth: { apiKey } });
}

export function docsSearchClient() {
  const client = elasticCloudClient();
  if (!client) {
    throw new Error(
      "ELASTIC_CLOUD_URL / ELASTIC_CLOUD_API_KEY are missing or ELASTIC_CLOUD_URL points at the Kibana website",
    );
  }
  return client;
}
