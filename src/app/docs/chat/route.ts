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
import { google } from "@ai-sdk/google";
import { flags } from "@/lib/flags";
import { clientIp } from "@/lib/clientIp";
import {
  chatQuotaReachedError,
  consumeDocsChatRateLimit,
} from "@/lib/rate-limit";
import { DOCS_INDEX, elasticClient } from "@/lib/docs/elastic";
import { expandDocsSearchTerm } from "@/lib/docs/searchTerms";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const COOKIE = "docs_chat_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;
const INDEX = DOCS_INDEX;
const RETRIEVE_SIZE = 20;
const RRF_RANK_CONSTANT = 60;
const MAX_GUIDES = 3;
const MIN_RELATIVE_RRF = 0.65;
const LEGAL_SCORE_PENALTY = 0.3;

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

function tokensClose(a: string, b: string) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  return a.slice(0, 4) === b.slice(0, 4);
}

function titleMatchesQuestion(title: string, question: string) {
  const questionTokens = searchTokens(question);
  return searchTokens(title).some((titleToken) =>
    questionTokens.some((questionToken) => tokensClose(titleToken, questionToken)),
  );
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

function readHits(
  hits: Array<{
    _id?: string;
    _source?: Partial<RankedHit> | null;
  }>,
): RankedHit[] {
  const out: RankedHit[] = [];
  for (const hit of hits) {
    const src = hit._source;
    if (!src?.href || !src.body) continue;
    out.push({
      id: String(hit._id ?? src.href),
      href: src.href,
      title: src.title || "",
      heading: src.heading || src.title || "",
      body: src.body,
    });
  }
  return out;
}

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
  const headingMatch = ranked.find(
    (row) =>
      !isPageLevel(row.hit) &&
      titleMatchesQuestion(row.hit.heading, question),
  );
  return headingMatch ?? ranked[0];
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

function lexicalQuery(question: string, publicFilter?: { term: { public: boolean } }) {
  const expanded = [
    ...new Set(
      question
        .split(/\s+/)
        .map((word) => word.replace(/[^\w'-]/g, ""))
        .filter((word) => word.length >= MIN_SEARCH_TOKEN)
        .flatMap((word) => expandDocsSearchTerm(word)),
    ),
  ].join(" ");

  return {
    bool: {
      should: [
        {
          multi_match: {
            query: question,
            type: "best_fields" as const,
            fields: ["title^5", "heading^3", "body"],
            fuzziness: "AUTO" as const,
            prefix_length: 2,
            boost: 2,
          },
        },
        ...(expanded
          ? [
              {
                multi_match: {
                  query: expanded,
                  type: "best_fields" as const,
                  fields: ["title^4", "heading^2", "body"],
                },
              },
            ]
          : []),
        {
          match_phrase: {
            title: { query: question, slop: 3, boost: 8 },
          },
        },
      ],
      minimum_should_match: 1,
      ...(publicFilter ? { filter: [publicFilter] } : {}),
    },
  };
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

async function getOrCreateSessionId(create: boolean) {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value?.trim();
  if (existing) return existing;
  if (!create) return null;

  const id = crypto.randomUUID();
  const supabase = createServiceClient();
  const { error } = await supabase.from("docs_chat_session").insert({ id });
  if (error) {
    throw new Error(error.message);
  }
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return id;
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
  store.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
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

  await persistMessage({ sessionId, role: "user", content: question });

  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: question,
    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });

  const publicFilter = flags.public ? { term: { public: true } } : undefined;
  const client = elasticClient();
  const sourceFields = ["href", "title", "heading", "body"] as const;
  const [lexicalRes, semanticRes] = await Promise.all([
    client.search<{
      href: string;
      title: string;
      heading: string;
      body: string;
    }>({
      index: INDEX,
      size: RETRIEVE_SIZE,
      query: lexicalQuery(question, publicFilter),
      _source: [...sourceFields],
    }),
    client.search<{
      href: string;
      title: string;
      heading: string;
      body: string;
    }>({
      index: INDEX,
      size: RETRIEVE_SIZE,
      knn: {
        field: "embedding",
        query_vector: embedding,
        k: RETRIEVE_SIZE,
        num_candidates: 50,
        ...(publicFilter ? { filter: publicFilter } : {}),
      },
      _source: [...sourceFields],
    }),
  ]);

  const picked = pickRelevantGuides(
    readHits(lexicalRes.hits.hits ?? []),
    readHits(semanticRes.hits.hits ?? []),
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
    model: google("gemini-3.6-flash"),
    system: refusal
      ? "You answer questions about guestbook documentation. Reply with exactly: I could not find that in these docs."
      : `You answer questions about guestbook documentation. Use only the excerpts below. Prefer a heading that matches the question over a page overview. Answer from those excerpts even if they are brief — name the steps they contain. Write the answer only. Do not list documentation URLs or add a sources section. Do not invent pages. Only say you could not find that in these docs if the excerpts are about a different topic.\n\n${excerpts}`,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      try {
        await persistMessage({
          sessionId,
          role: "assistant",
          content: text,
          sources: refusal ? [] : sources,
        });
      } catch (err) {
        console.error(err);
      }
    },
  });

  if (!prefix) {
    return result.toUIMessageStreamResponse();
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = "docs-chat";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: prefix });
      for await (const delta of result.textStream) {
        writer.write({ type: "text-delta", id, delta });
      }
      writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
