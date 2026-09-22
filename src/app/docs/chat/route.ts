import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  embed,
  streamText,
  type UIMessage,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { flags } from "@/lib/flags";
import { clientIp } from "@/lib/clientIp";
import {
  chatQuotaReachedError,
  consumeDocsChatRateLimit,
} from "@/lib/rate-limit";
import { expandDocsSearchTerm } from "@/lib/docs/searchTerms";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const COOKIE = "docs_chat_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;
const RETRIEVE_SIZE = 20;
const RRF_RANK_CONSTANT = 60;
const MAX_GUIDES = 3;
const MIN_RELATIVE_RRF = 0.65;
const LEGAL_SCORE_PENALTY = 0.3;
const QUERY_EMBED_MODEL = "gemini-embedding-001";
const QUERY_EMBED_DIMS = 768;
const QUERY_EMBED_TASK = "RETRIEVAL_QUERY";
const QUERY_EMBED_CACHE_MAX = 200;

type QueryEmbedCache = {
  model: string;
  dims: number;
  taskType: string;
  vectors: Record<string, number[]>;
};

let queryEmbedCache: QueryEmbedCache | null = null;

function errorText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function isQuotaError(err: unknown) {
  return /429|RESOURCE_EXHAUSTED|quota/i.test(errorText(err));
}

function isHighDemandError(err: unknown) {
  if (
    err &&
    typeof err === "object" &&
    "statusCode" in err &&
    (err as { statusCode?: unknown }).statusCode === 503
  ) {
    return true;
  }
  return /UNAVAILABLE|high demand/i.test(errorText(err));
}

const CHAT_HIGH_DEMAND_ERROR =
  "This chatbot is currently experiencing high demand. Please try again later.";

function chatStreamErrorText(err: unknown) {
  if (isQuotaError(err)) {
    return chatQuotaReachedError(retryAtFromGemini(err));
  }
  if (isHighDemandError(err)) {
    return CHAT_HIGH_DEMAND_ERROR;
  }
  return "Something went wrong. Please try again later.";
}

function isDailyQuota(err: unknown) {
  return /PerDay|GenerateRequestsPerDay|per day/i.test(errorText(err));
}

function geminiRetryMs(err: unknown) {
  const match = errorText(err).match(/Please retry in ([0-9.]+)s/i);
  if (!match) return null;
  return Number(match[1]) * 1000;
}

function tzOffsetMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return (
    Date.UTC(
      n("year"),
      n("month") - 1,
      n("day"),
      n("hour"),
      n("minute"),
      n("second"),
    ) - utcMs
  );
}

function nextMidnightInTimeZone(timeZone: string, nowMs = Date.now()) {
  const offset = tzOffsetMs(nowMs, timeZone);
  const local = new Date(nowMs + offset);
  const nextLocalMidnightAsUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
  );
  const guess = nextLocalMidnightAsUtc - offset;
  return new Date(nextLocalMidnightAsUtc - tzOffsetMs(guess, timeZone));
}

function retryAtFromGemini(err: unknown) {
  if (isDailyQuota(err)) {
    return nextMidnightInTimeZone("America/Los_Angeles");
  }
  const delay = geminiRetryMs(err);
  if (delay != null) return new Date(Date.now() + delay);
  return nextMidnightInTimeZone("America/Los_Angeles");
}

function gemini() {
  const apiKey = process.env.SUPABOT_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing SUPABOT_API_KEY");
  }
  return createGoogleGenerativeAI({ apiKey });
}

function questionEmbedKey(text: string) {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

function emptyQueryCache(): QueryEmbedCache {
  return {
    model: QUERY_EMBED_MODEL,
    dims: QUERY_EMBED_DIMS,
    taskType: QUERY_EMBED_TASK,
    vectors: {},
  };
}

function rememberedEmbedding(key: string) {
  const cached = queryEmbedCache?.vectors[key];
  if (Array.isArray(cached) && cached.length === QUERY_EMBED_DIMS) return cached;
  return null;
}

function rememberEmbedding(key: string, embedding: number[]) {
  if (!queryEmbedCache) queryEmbedCache = emptyQueryCache();
  queryEmbedCache.vectors[key] = embedding;
  const keys = Object.keys(queryEmbedCache.vectors);
  if (keys.length <= QUERY_EMBED_CACHE_MAX) return;
  for (const old of keys.slice(0, keys.length - QUERY_EMBED_CACHE_MAX)) {
    delete queryEmbedCache.vectors[old];
  }
}

function parseEmbedding(value: unknown) {
  const nums = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.replace(/^\[|\]$/g, "").split(",")
      : null;
  if (!nums || nums.length !== QUERY_EMBED_DIMS) return null;
  const embedding = nums.map(Number);
  if (embedding.some((n) => Number.isNaN(n))) return null;
  return embedding;
}

async function readSharedEmbedding(key: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("docs_query_embedding")
    .select("embedding")
    .eq("id", key)
    .eq("model", QUERY_EMBED_MODEL)
    .eq("dims", QUERY_EMBED_DIMS)
    .eq("task_type", QUERY_EMBED_TASK)
    .maybeSingle();
  if (error) {
    console.error(error.message);
    return null;
  }
  return data ? parseEmbedding(data.embedding) : null;
}

async function writeSharedEmbedding(key: string, embedding: number[]) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("docs_query_embedding").upsert({
    id: key,
    model: QUERY_EMBED_MODEL,
    dims: QUERY_EMBED_DIMS,
    task_type: QUERY_EMBED_TASK,
    embedding: `[${embedding.join(",")}]`,
    created_at: new Date().toISOString(),
  });
  if (error) console.error(error.message);
}

async function embedQuestion(question: string) {
  const key = questionEmbedKey(question);
  const remembered = rememberedEmbedding(key);
  if (remembered) return remembered;

  const shared = await readSharedEmbedding(key);
  if (shared) {
    rememberEmbedding(key, shared);
    return shared;
  }

  const { embedding } = await embed({
    model: gemini().embedding(QUERY_EMBED_MODEL),
    value: question,
    maxRetries: 0,
    providerOptions: {
      google: {
        outputDimensionality: QUERY_EMBED_DIMS,
        taskType: QUERY_EMBED_TASK,
      },
    },
  });

  rememberEmbedding(key, embedding);
  await writeSharedEmbedding(key, embedding);
  return embedding;
}

type ChatSource = {
  href: string;
  title: string;
  heading: string;
};

function textFromParts(message: UIMessage) {
  return (message.parts ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function lastUserText(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = textFromParts(message);
    if (text) return text;
  }
  return "";
}

function pageHref(href: string) {
  const hash = href.indexOf("#");
  return hash === -1 ? href : href.slice(0, hash);
}

function pageKey(href: string) {
  return pageHref(href).replace(/\/+$/, "");
}

function isPageLevel(hit: RankedHit) {
  return !hit.href.includes("#") || hit.heading === hit.title;
}

function isLegalOrTestPage(href: string) {
  const page = pageKey(href);
  return (
    page.endsWith("/policy") ||
    page.endsWith("/service") ||
    page.endsWith("/tests")
  );
}

function questionAsksLegalOrTest(question: string) {
  return /\b(privacy|policy|terms|tos|legal|license|gdpr|cookie|cucumber|test(s|ing)?)\b/i.test(
    question,
  );
}

const MIN_SEARCH_TOKEN = 3;

function searchTokens(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= MIN_SEARCH_TOKEN)
        .flatMap((word) => expandDocsSearchTerm(word)),
    ),
  ];
}

function isStubBody(hit: RankedHit) {
  const body = hit.body.trim();
  if (!body) return true;
  const fallback = `${hit.title} ${hit.heading}`.trim();
  return body === fallback || body === hit.title || body === hit.heading;
}

function headingMatchesQuestion(hit: RankedHit, question: string) {
  if (isPageLevel(hit) || isStubBody(hit)) return false;
  const titleTokens = new Set(searchTokens(hit.title));
  const extra = searchTokens(hit.heading).filter((token) => !titleTokens.has(token));
  if (extra.length === 0) return false;
  const questionTokens = new Set(searchTokens(question));
  return extra.some((headingToken) => questionTokens.has(headingToken));
}

function docsListMarkdown(sources: ChatSource[]) {
  const unique: ChatSource[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const href = pageHref(source.href);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    unique.push({ ...source, href });
  }
  return unique
    .map((source) => `- [${source.title || source.heading}](${source.href})`)
    .join("\n");
}

function assistantMarkdown(summary: string, sources: ChatSource[]) {
  const list = docsListMarkdown(sources);
  if (!list) return summary;
  return `## Relevant Guides\n\n${list}\n\n## Summary\n\n${summary}`;
}

type RankedHit = {
  id: string;
  href: string;
  title: string;
  heading: string;
  body: string;
};

function rrfRanks(hits: RankedHit[]) {
  const ranks = new Map<string, number>();
  hits.forEach((hit, index) => {
    if (!ranks.has(hit.id)) {
      ranks.set(hit.id, index + 1);
    }
  });
  return ranks;
}

function pickChunkForPage(
  rows: { hit: RankedHit; score: number }[],
  question: string,
) {
  const ranked = [...rows].sort((a, b) => b.score - a.score);
  const headingMatch = ranked.find((row) =>
    headingMatchesQuestion(row.hit, question),
  );
  if (headingMatch) return headingMatch;
  return ranked.find((row) => !isStubBody(row.hit)) ?? ranked[0];
}

function pickRelevantGuides(
  lexical: RankedHit[],
  semantic: RankedHit[],
  question: string,
) {
  const byId = new Map<string, RankedHit>();
  for (const hit of [...lexical, ...semantic]) {
    if (!byId.has(hit.id)) byId.set(hit.id, hit);
  }

  const scores = new Map<string, number>();
  for (const ranks of [rrfRanks(lexical), rrfRanks(semantic)]) {
    for (const [id, rank] of ranks) {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_RANK_CONSTANT + rank));
    }
  }

  const lexicalPages = new Set(lexical.map((hit) => pageHref(hit.href)));
  const byPage = new Map<string, { hit: RankedHit; score: number }[]>();
  for (const [id, score] of scores) {
    const hit = byId.get(id);
    if (!hit) continue;
    const page = pageHref(hit.href);
    const list = byPage.get(page) ?? [];
    list.push({ hit, score });
    byPage.set(page, list);
  }

  const allowLegal = questionAsksLegalOrTest(question);
  const ranked = [...byPage.values()]
    .map((rows) => pickChunkForPage(rows, question))
    .map((row) =>
      !allowLegal && isLegalOrTestPage(row.hit.href)
        ? { ...row, score: row.score * LEGAL_SCORE_PENALTY }
        : row,
    )
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return [];

  const top = ranked[0].score;
  return ranked
    .filter((row) => {
      if (row.score < top * MIN_RELATIVE_RRF) return false;
      if (lexicalPages.size === 0) return true;
      if (lexicalPages.has(pageHref(row.hit.href))) return true;
      return row.score >= top * 0.85;
    })
    .slice(0, MAX_GUIDES)
    .map((row) => row.hit);
}

function keywordTsQuery(question: string) {
  const terms = [
    ...new Set(
      question
        .split(/\s+/)
        .map((word) => word.replace(/[^\w'-]/g, ""))
        .filter((word) => word.length >= MIN_SEARCH_TOKEN)
        .flatMap((word) => expandDocsSearchTerm(word))
        .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter((word) => word.length >= MIN_SEARCH_TOKEN),
    ),
  ];
  return terms.join(" | ");
}

type DocsSectionRow = {
  id: string;
  href: string;
  title: string | null;
  heading: string | null;
  body: string | null;
};

function sectionHits(rows: DocsSectionRow[] | null): RankedHit[] {
  const out: RankedHit[] = [];
  for (const row of rows ?? []) {
    if (!row.href || !row.body) continue;
    out.push({
      id: row.id,
      href: row.href,
      title: row.title || "",
      heading: row.heading || row.title || "",
      body: row.body,
    });
  }
  return out;
}

function toUiMessages(
  rows: {
    id: string;
    role: string;
    content: string;
    sources: ChatSource[] | null;
  }[],
): UIMessage[] {
  return rows.map((row) => {
    const sources = Array.isArray(row.sources) ? row.sources : [];
    const text =
      row.role === "assistant"
        ? assistantMarkdown(row.content, sources)
        : row.content;
    return {
      id: row.id,
      role: row.role === "assistant" ? "assistant" : "user",
      parts: [{ type: "text", text }],
    };
  });
}

function isSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

async function getOrCreateSessionId(create: boolean) {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value?.trim();
  const cookieId = existing && isSessionId(existing) ? existing : null;
  if (!create) return cookieId;

  const sessionId = cookieId ?? crypto.randomUUID();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("docs_chat_session")
    .upsert({ id: sessionId });
  if (error) {
    throw new Error(error.message);
  }
  store.set(COOKIE, sessionId, sessionCookieOptions());
  return sessionId;
}

async function persistMessage(row: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("docs_chat_message").insert({
    session_id: row.sessionId,
    role: row.role,
    content: row.content,
    sources: row.sources ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function GET() {
  const sessionId = await getOrCreateSessionId(false);
  if (!sessionId) {
    return Response.json({ messages: [] });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("docs_chat_message")
    .select("id, role, content, sources")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({
    messages: toUiMessages(data ?? []),
  });
}

export async function DELETE() {
  const store = await cookies();
  const sessionId = store.get(COOKIE)?.value?.trim();
  if (sessionId) {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("docs_chat_session")
      .delete()
      .eq("id", sessionId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  store.set(COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const limited = await consumeDocsChatRateLimit(await clientIp());
  if (!limited.ok) {
    return Response.json({ error: limited.error }, { status: 429 });
  }

  let body: { messages?: UIMessage[] };
  try {
    body = (await request.json()) as { messages?: UIMessage[] };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const question = lastUserText(messages);
  if (!question) {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId(true);
  if (!sessionId) {
    return Response.json({ error: "Could not start a chat session." }, { status: 500 });
  }

  try {
    await persistMessage({ sessionId, role: "user", content: question });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Could not save this chat turn." },
      { status: 500 },
    );
  }

  let embedding: number[] | null = null;
  try {
    embedding = await embedQuestion(question);
  } catch (err) {
    if (!isQuotaError(err) && !isHighDemandError(err)) throw err;
  }

  const onlyPublic = flags.public;
  const keyword = keywordTsQuery(question);
  const supabase = createServiceClient();
  const lexicalSearch = keyword
    ? supabase.rpc("search_docs_sections", {
        query: keyword,
        match_count: RETRIEVE_SIZE,
        only_public: onlyPublic,
      })
    : Promise.resolve({ data: [] as DocsSectionRow[], error: null });
  const semanticSearch = embedding
    ? supabase.rpc("match_docs_sections", {
        query_embedding: `[${embedding.join(",")}]`,
        match_count: RETRIEVE_SIZE,
        only_public: onlyPublic,
      })
    : Promise.resolve({ data: [] as DocsSectionRow[], error: null });

  const [lexicalRes, semanticRes] = await Promise.all([
    lexicalSearch,
    semanticSearch,
  ]);
  if (lexicalRes.error) {
    throw new Error(lexicalRes.error.message);
  }
  if (semanticRes.error) {
    throw new Error(semanticRes.error.message);
  }

  const picked = pickRelevantGuides(
    sectionHits(lexicalRes.data as DocsSectionRow[] | null),
    sectionHits(semanticRes.data as DocsSectionRow[] | null),
    question,
  );

  const sources: ChatSource[] = picked.map((hit) => ({
    href: pageHref(hit.href),
    title: hit.title,
    heading: hit.title || hit.heading,
  }));

  const excerpts = picked
    .map(
      (hit, i) =>
        `[${i + 1}] ${hit.title} — ${hit.heading}\nURL: ${pageHref(hit.href)}\n${hit.body}`,
    )
    .join("\n\n");

  const refusal = picked.length === 0;
  const prefix = refusal ? "" : assistantMarkdown("", sources);
  const result = streamText({
    model: gemini()("gemini-3.6-flash"),
    maxRetries: 0,
    maxOutputTokens: 4096,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: "minimal",
        },
      },
    },
    system: refusal
      ? "You answer questions about guestbook documentation. Reply with exactly: I could not find that in these docs."
      : `You answer questions about guestbook documentation. Use only the excerpts below. Prefer a heading that matches the question over a page overview. Answer from those excerpts even if they are brief — name the steps they contain. Write a short complete summary: a few sentences, or up to five finished bullets. Finish the last sentence. Do not stop mid-phrase. Do not list documentation URLs or add a sources section. Do not invent pages. Only say you could not find that in these docs if the excerpts are about a different topic.\n\n${excerpts}`,
    messages: await convertToModelMessages(messages),
  });

  const stream = createUIMessageStream({
    onError: chatStreamErrorText,
    execute: async ({ writer }) => {
      const id = "docs-chat";
      let summary = "";
      let started = false;
      try {
        if (prefix) {
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: prefix });
          started = true;
        }
        for await (const delta of result.textStream) {
          if (!started) {
            writer.write({ type: "text-start", id });
            started = true;
          }
          summary += delta;
          writer.write({ type: "text-delta", id, delta });
        }
        if (started) {
          writer.write({ type: "text-end", id });
        }
      } catch (err) {
        console.error(err);
        const text = chatStreamErrorText(err);
        if (!started) {
          writer.write({ type: "text-start", id });
        }
        writer.write({ type: "text-delta", id, delta: text });
        writer.write({ type: "text-end", id });
        writer.setOutcome({ status: "failed", error: err });
        throw err;
      }
      const assistantText = summary.trim();
      if (!assistantText && sources.length === 0) return;
      try {
        await persistMessage({
          sessionId,
          role: "assistant",
          content: assistantText,
          sources: refusal ? [] : sources,
        });
      } catch (err) {
        console.error(err);
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
