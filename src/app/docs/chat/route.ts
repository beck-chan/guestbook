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
import { consumeDocsChatRateLimit } from "@/lib/rate-limit";
import { DOCS_INDEX, elasticClient } from "@/lib/docs/elastic";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const COOKIE = "docs_chat_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;
const INDEX = DOCS_INDEX;

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

function docsListMarkdown(sources: ChatSource[]) {
  const unique: ChatSource[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!source.href || seen.has(source.href)) continue;
    seen.add(source.href);
    unique.push(source);
  }
  return unique
    .map((source) => `- [${source.heading || source.title}](${source.href})`)
    .join("\n");
}

function assistantMarkdown(summary: string, sources: ChatSource[]) {
  const list = docsListMarkdown(sources);
  if (!list) return summary;
  return `## Docs\n\n${list}\n\n## Summary\n\n${summary}`;
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
  const search = await client.search<{
    href: string;
    title: string;
    heading: string;
    body: string;
  }>({
    index: INDEX,
    size: 8,
    query: {
      bool: {
        should: [
          {
            multi_match: {
              query: question,
              fields: ["title^2", "heading^2", "body"],
            },
          },
        ],
        ...(publicFilter ? { filter: [publicFilter] } : {}),
      },
    },
    knn: {
      field: "embedding",
      query_vector: embedding,
      k: 8,
      num_candidates: 40,
      ...(publicFilter ? { filter: publicFilter } : {}),
    },
    _source: ["href", "title", "heading", "body"],
  });

  const hits = (search.hits.hits ?? [])
    .map((hit) => hit._source)
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.href && row.body));

  const sources: ChatSource[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (seen.has(hit.href)) continue;
    seen.add(hit.href);
    sources.push({
      href: hit.href,
      title: hit.title,
      heading: hit.heading || hit.title,
    });
  }

  const excerpts = hits
    .slice(0, 6)
    .map(
      (hit, i) =>
        `[${i + 1}] ${hit.title} — ${hit.heading}\nURL: ${hit.href}\n${hit.body}`,
    )
    .join("\n\n");

  const refusal = hits.length === 0;
  const prefix = refusal ? "" : assistantMarkdown("", sources);
  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: refusal
      ? "You answer questions about guestbook documentation. Reply with exactly: I could not find that in these docs."
      : `You answer questions about guestbook documentation. Use only the excerpts below. If they are not enough, say you could not find that in these docs. Write the answer only. Do not list documentation URLs or add a sources section. Do not invent pages.\n\n${excerpts}`,
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
