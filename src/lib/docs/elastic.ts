import { Client } from "@elastic/elasticsearch";

export const DOCS_INDEX = "guestbook-docs";

export function elasticClient() {
  const node = process.env.ELASTIC_URL?.trim();
  const apiKey = process.env.ELASTIC_API_KEY?.trim();
  if (!node || !apiKey) {
    throw new Error("Missing ELASTIC_URL or ELASTIC_API_KEY");
  }
  return new Client({ node, auth: { apiKey } });
}
