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

function isKibanaUiUrl(url: string) {
  try {
    return new URL(url).port === "5601";
  } catch {
    return true;
  }
}

export function kibanaStackClient() {
  const node = process.env.KIBANA_URL?.trim();
  const apiKey = process.env.KIBANA_API_KEY?.trim();
  if (!node || !apiKey || isKibanaUiUrl(node)) {
    return null;
  }
  return new Client({ node, auth: { apiKey } });
}

