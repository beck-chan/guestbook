import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMS = 768;
const EMBED_TASK = "RETRIEVAL_DOCUMENT";
const CACHE_PATH = path.join(process.cwd(), "internal/elastic/embed-cache.json");

type EmbedCache = {
  model: string;
  dims: number;
  taskType: string;
  vectors: Record<string, number[]>;
};

function cacheKey(id: string, text: string) {
  return createHash("sha256").update(`${id}\n${text}`).digest("hex");
}

function emptyCache(): EmbedCache {
  return {
    model: EMBED_MODEL,
    dims: EMBED_DIMS,
    taskType: EMBED_TASK,
    vectors: {},
  };
}

function loadCache(): EmbedCache {
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as EmbedCache;
    if (
      parsed.model !== EMBED_MODEL ||
      parsed.dims !== EMBED_DIMS ||
      parsed.taskType !== EMBED_TASK ||
      !parsed.vectors ||
      typeof parsed.vectors !== "object"
    ) {
      return emptyCache();
    }
    return parsed;
  } catch {
    return emptyCache();
  }
}

function saveCache(cache: EmbedCache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache)}\n`);
}

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

async function embedTexts(docs: { id: string; text: string }[]) {
  const cache = loadCache();
  const embeddings: number[][] = new Array(docs.length);
  const missing: number[] = [];

  for (let i = 0; i < docs.length; i += 1) {
    const key = cacheKey(docs[i].id, docs[i].text);
    const cached = cache.vectors[key];
    if (Array.isArray(cached) && cached.length === EMBED_DIMS) {
      embeddings[i] = cached;
    } else {
      missing.push(i);
    }
  }

  console.log(
    `Embed cache: ${docs.length - missing.length} unchanged, ${missing.length} to send to Gemini`,
  );

  let windowCount = 0;
  let windowStart = Date.now();

  for (let n = 0; n < missing.length; n += 1) {
    const i = missing[n];
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
          model: google.embedding(EMBED_MODEL),
          value: docs[i].text,
          providerOptions: {
            google: {
              outputDimensionality: EMBED_DIMS,
              taskType: EMBED_TASK,
            },
          },
        });
        embeddings[i] = result.embedding;
        cache.vectors[cacheKey(docs[i].id, docs[i].text)] = result.embedding;
        saveCache(cache);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        const delay = retryDelayMs(err);
        console.log(
          `Embed ${n + 1}/${missing.length} hit quota; retry in ${Math.ceil(delay / 1000)}s`,
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
    if ((n + 1) % 10 === 0 || n + 1 === missing.length) {
      console.log(`Embedded ${n + 1} / ${missing.length}`);
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

  const chunks = docs.map((doc) => {
    const body = doc.body.trim();
    return {
      id: doc.id,
      text: body || `${doc.title} ${doc.heading}`.trim(),
    };
  });

  const embeddings = await embedTexts(chunks);

  if (embeddings.length !== docs.length) {
    console.error("Embedding count did not match document count.");
    process.exit(1);
  }

  const client = elasticClient();
  const exists = await client.indices.exists({ index: DOCS_INDEX });
  if (exists) {
    await client.indices.delete({ index: DOCS_INDEX });
  }

  await client.indices.create({
    index: DOCS_INDEX,
    mappings: {
      properties: {
        id: { type: "keyword" },
        href: { type: "keyword" },
        title: { type: "text", analyzer: "english" },
        heading: { type: "text", analyzer: "english" },
        section: { type: "keyword" },
        body: { type: "text", analyzer: "english" },
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
    body: chunks[i].text,
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
