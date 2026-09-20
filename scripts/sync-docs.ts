import { config } from "dotenv";

config({ path: ".env.local" });

import { embed } from "ai";
import { google } from "@ai-sdk/google";
import {
  composeDocsCorpus,
  flattenSearchDocs,
} from "../src/lib/docs/compose";
import { DOCS_INDEX, elasticClient } from "../src/lib/docs/elastic";

const EMBED_PER_MINUTE = 80;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/Please retry in ([0-9.]+)s/i);
  if (match) {
    return Math.ceil(Number(match[1]) * 1000) + 1500;
  }
  return 20_000;
}

async function embedTexts(texts: string[]) {
  const embeddings: number[][] = [];
  let windowCount = 0;
  let windowStart = Date.now();

  for (let i = 0; i < texts.length; i += 1) {
    if (windowCount >= EMBED_PER_MINUTE) {
      const wait = 60_000 - (Date.now() - windowStart) + 1500;
      if (wait > 0) {
        console.log(`Waiting ${Math.ceil(wait / 1000)}s for Gemini embed quota`);
        await sleep(wait);
      }
      windowCount = 0;
      windowStart = Date.now();
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const result = await embed({
          model: google.embedding("gemini-embedding-001"),
          value: texts[i],
          providerOptions: {
            google: {
              outputDimensionality: 768,
              taskType: "RETRIEVAL_DOCUMENT",
            },
          },
        });
        embeddings.push(result.embedding);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        const delay = retryDelayMs(err);
        console.log(
          `Embed ${i + 1}/${texts.length} hit quota; retry in ${Math.ceil(delay / 1000)}s`,
        );
        await sleep(delay);
        windowCount = 0;
        windowStart = Date.now();
      }
    }
    if (lastError) {
      throw lastError;
    }
    windowCount += 1;
    if ((i + 1) % 10 === 0 || i + 1 === texts.length) {
      console.log(`Embedded ${i + 1} / ${texts.length}`);
    }
  }

  return embeddings;
}

async function main() {
  const branch = process.env.BRANCH?.trim() || "main";
  const elasticUrl = process.env.ELASTIC_URL?.trim();
  const elasticKey = process.env.ELASTIC_API_KEY?.trim();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!elasticUrl || !elasticKey || !geminiKey) {
    console.error(
      "Missing ELASTIC_URL, ELASTIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    );
    process.exit(1);
  }

  console.log(`Indexing docs from Git ref ${branch} into ${elasticUrl}`);

  const docs = flattenSearchDocs(
    composeDocsCorpus({ forIndex: true, gitRef: branch }),
  );
  if (docs.length === 0) {
    console.error(`No indexable docs on ${branch}.`);
    process.exit(1);
  }

  const texts = docs.map((doc) => {
    const body = doc.body.trim();
    return body || `${doc.title} ${doc.heading}`.trim();
  });

  const embeddings = await embedTexts(texts);

  if (embeddings.length !== docs.length) {
    console.error("Embedding count did not match document count.");
    process.exit(1);
  }

  const client = elasticClient();
  const exists = await client.indices.exists({ index: DOCS_INDEX });
  if (exists === true || (exists as { body?: boolean })?.body === true) {
    await client.indices.delete({ index: DOCS_INDEX });
  }

  await client.indices.create({
    index: DOCS_INDEX,
    mappings: {
      properties: {
        id: { type: "keyword" },
        href: { type: "keyword" },
        title: { type: "text" },
        heading: { type: "text" },
        section: { type: "keyword" },
        body: { type: "text" },
        public: { type: "boolean" },
        embedding: {
          type: "dense_vector",
          dims: 768,
          index: true,
          similarity: "cosine",
        },
      },
    },
  });

  const operations = docs.map((doc, i) => ({
    id: doc.id,
    href: doc.href,
    title: doc.title,
    heading: doc.heading,
    section: doc.section ?? "",
    body: texts[i],
    public: doc.public,
    embedding: embeddings[i],
  }));

  const bulk = await client.helpers.bulk({
    datasource: operations,
    onDocument(doc) {
      return {
        index: { _index: DOCS_INDEX, _id: doc.id },
      };
    },
  });

  if (bulk.failed > 0) {
    console.error(`Bulk index failed ${bulk.failed} of ${operations.length}`);
    process.exit(1);
  }

  console.log(`Indexed ${operations.length} chunks from ${branch}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
