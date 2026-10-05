import { CHAT_INDEX, elasticCloudClient } from "./elastic";

export type ChatCopySource = {
  href: string;
  title: string;
  heading: string;
};

export type ChatCopyHit = {
  id: string;
  href: string;
  title: string;
  heading: string;
};

export type ChatCopyDoc = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatCopySource[] | null;
  created_at: string;
  retrieval?: {
    picked: ChatCopyHit[];
    lexical: ChatCopyHit[];
    knn: ChatCopyHit[];
  };
};

let chatIndexReady = false;

async function ensureChatIndex() {
  const client = elasticCloudClient();
  if (!client) return null;
  if (chatIndexReady) return client;

  const exists = await client.indices.exists({ index: CHAT_INDEX });
  if (!exists) {
    await client.indices.create({
      index: CHAT_INDEX,
      mappings: {
        properties: {
          id: { type: "keyword" },
          session_id: { type: "keyword" },
          role: { type: "keyword" },
          content: { type: "text" },
          sources: { type: "object", enabled: true },
          created_at: { type: "date" },
          retrieval: { type: "object", enabled: true },
        },
      },
    });
  }
  chatIndexReady = true;
  return client;
}

export async function copyChatMessage(doc: ChatCopyDoc) {
  try {
    const client = await ensureChatIndex();
    if (!client) return;
    await client.index({
      index: CHAT_INDEX,
      id: doc.id,
      document: doc,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function deleteChatSessionCopy(sessionId: string) {
  const client = elasticCloudClient();
  if (!client) return;
  try {
    await client.deleteByQuery({
      index: CHAT_INDEX,
      query: { term: { session_id: sessionId } },
      refresh: true,
    });
  } catch (err) {
    console.error(err);
  }
}
