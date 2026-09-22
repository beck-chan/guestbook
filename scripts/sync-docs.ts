import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  composeDocsCorpus,
  flattenSearchDocs,
} from "../src/lib/docs/compose";
import { createServiceClient } from "../src/lib/supabase/service";

config({ path: ".env.local" });

const EMBED_PER_MINUTE = 80;
const EMBED_BATCH = 20;
const UPSERT_BATCH = 40;
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMS = 768;
const EMBED_TASK = "RETRIEVAL_DOCUMENT";
const CACHE_PATH = path.join(process.cwd(), "internal/supabot/embed-cache.json");

type EmbedCache = {
  model: string;
  dims: number;
  taskType: string;
  vectors: Record<string, number[]>;
};

type Chunk = {
  id: string;
  text: string;
  hash: string;
  href: string;
  title: string;
  heading: string;
  section: string;
  public: boolean;
};

function contentHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
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

function vectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

async function embedTexts(
  docs: { hash: string; text: string }[],
  apiKey: string,
) {
  const google = createGoogleGenerativeAI({ apiKey });
  const cache = loadCache();
  const embeddings: number[][] = new Array(docs.length);
  const missing: number[] = [];

  for (let i = 0; i < docs.length; i += 1) {
    const cached = cache.vectors[docs[i].hash];
    if (Array.isArray(cached) && cached.length === EMBED_DIMS) {
      embeddings[i] = cached;
    } else {
      missing.push(i);
    }
  }

  console.log(
    `Embed cache: ${docs.length - missing.length} reused, ${missing.length} to send to Gemini`,
  );

  let windowCount = 0;
  let windowStart = Date.now();

  for (let n = 0; n < missing.length; n += EMBED_BATCH) {
    const slice = missing.slice(n, n + EMBED_BATCH);
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
        const result = await embedMany({
          model: google.embedding(EMBED_MODEL),
          values: slice.map((i) => docs[i].text),
          maxRetries: 0,
          providerOptions: {
            google: {
              outputDimensionality: EMBED_DIMS,
              taskType: EMBED_TASK,
            },
          },
        });
        slice.forEach((i, j) => {
          embeddings[i] = result.embeddings[j];
          cache.vectors[docs[i].hash] = result.embeddings[j];
        });
        saveCache(cache);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        const delay = retryDelayMs(err);
        console.log(
          `Embed batch ${Math.floor(n / EMBED_BATCH) + 1} hit quota; retry in ${Math.ceil(delay / 1000)}s`,
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
    const done = Math.min(n + EMBED_BATCH, missing.length);
    console.log(`Embedded ${done} / ${missing.length}`);
  }

  return embeddings;
}

async function main() {
  const branch = process.env.BRANCH?.trim() || "main";
  const geminiKey = process.env.SUPABOT_API_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!geminiKey || !supabaseUrl || !serviceKey) {
    console.error(
      "Missing SUPABOT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  console.log(`Indexing docs from Git ref ${branch} into docs_section`);

  const docs = flattenSearchDocs(
    composeDocsCorpus({ forIndex: true, gitRef: branch }),
  );
  if (docs.length === 0) {
    console.error(`No indexable docs on ${branch}.`);
    process.exit(1);
  }

  const chunks: Chunk[] = docs.map((doc) => {
    const body = doc.body.trim();
    const text = body || `${doc.title} ${doc.heading}`.trim();
    return {
      id: doc.id,
      text,
      hash: contentHash(text),
      href: doc.href,
      title: doc.title,
      heading: doc.heading,
      section: doc.section ?? "",
      public: doc.public,
    };
  });

  const supabase = createServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("docs_section")
    .select("id, content_hash");
  if (existingError) {
    throw new Error(existingError.message);
  }

  const hashById = new Map(
    (existing ?? []).map((row) => [row.id as string, row.content_hash as string]),
  );
  const staleIds = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !chunks.some((chunk) => chunk.id === id));
  const pending = chunks.filter((chunk) => hashById.get(chunk.id) !== chunk.hash);

  console.log(
    `docs_section: ${chunks.length - pending.length} unchanged, ${pending.length} to upsert, ${staleIds.length} to delete`,
  );

  const embeddings = await embedTexts(
    pending.map((chunk) => ({ hash: chunk.hash, text: chunk.text })),
    geminiKey,
  );

  if (embeddings.length !== pending.length) {
    console.error("Embedding count did not match document count.");
    process.exit(1);
  }

  const rows = pending.map((chunk, i) => ({
    id: chunk.id,
    href: chunk.href,
    title: chunk.title,
    heading: chunk.heading,
    section: chunk.section,
    body: chunk.text,
    public: chunk.public,
    content_hash: chunk.hash,
    embedding: vectorLiteral(embeddings[i]),
  }));

  for (let n = 0; n < rows.length; n += UPSERT_BATCH) {
    const slice = rows.slice(n, n + UPSERT_BATCH);
    const { error } = await supabase.from("docs_section").upsert(slice);
    if (error) {
      throw new Error(error.message);
    }
  }

  for (let n = 0; n < staleIds.length; n += UPSERT_BATCH) {
    const slice = staleIds.slice(n, n + UPSERT_BATCH);
    const { error } = await supabase.from("docs_section").delete().in("id", slice);
    if (error) {
      throw new Error(error.message);
    }
  }

  console.log(`Indexed ${chunks.length} chunks from ${branch}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
