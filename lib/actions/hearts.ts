"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const VISITOR_COOKIE = "poem_visitor_key";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365 * 5;

export type PoemHeartState = {
  liked: boolean;
  heart_count: number;
  total_hearts: number;
};

function asHeartState(data: unknown): PoemHeartState {
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    liked: Boolean(row.liked),
    heart_count: Number(row.heart_count ?? 0),
    total_hearts: Number(row.total_hearts ?? 0),
  };
}

async function getOrCreateVisitorKey() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value?.trim();
  if (existing) {
    return existing;
  }

  const key = crypto.randomUUID();
  cookieStore.set(VISITOR_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
  return key;
}

export async function getPoemHeartState(poemId: string): Promise<PoemHeartState> {
  const trimmed = poemId.trim();
  if (!trimmed) {
    return { liked: false, heart_count: 0, total_hearts: 0 };
  }

  const visitorKey = await getOrCreateVisitorKey();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("poem_heart_state", {
    p_poem_id: trimmed,
    p_visitor_key: visitorKey,
  });

  if (error) {
    return { liked: false, heart_count: 0, total_hearts: 0 };
  }

  return asHeartState(data);
}

export async function togglePoemHeart(poemId: string): Promise<PoemHeartState> {
  const trimmed = poemId.trim();
  if (!trimmed) {
    return { liked: false, heart_count: 0, total_hearts: 0 };
  }

  const visitorKey = await getOrCreateVisitorKey();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_poem_heart", {
    p_poem_id: trimmed,
    p_visitor_key: visitorKey,
  });

  if (error) {
    return getPoemHeartState(trimmed);
  }

  return asHeartState(data);
}

export type PoemHeartsOverview = { counts: Record<string, number>; totalHearts: number; liked: string[] };
export async function loadPoemHearts(poemIds: string[]): Promise<PoemHeartsOverview> {
  const visitorKey = await getOrCreateVisitorKey();
  const supabase = await createClient();
  const [countsRes, totalRes, ...likedResults] = await Promise.all([
    supabase.from("poem_heart_counts").select("poem_id, heart_count"),
    supabase.from("poem_heart_total").select("total_hearts").maybeSingle(),
    ...poemIds.map((poemId) => supabase.rpc("poem_heart_state", { p_poem_id: poemId, p_visitor_key: visitorKey })),
  ]);
  const counts: Record<string, number> = {};
  for (const row of countsRes.data ?? []) counts[String(row.poem_id)] = Number(row.heart_count) || 0;
  const liked: string[] = [];
  poemIds.forEach((poemId, index) => {
    const payload = asHeartState(likedResults[index]?.data);
    if (payload.liked) liked.push(poemId);
    if (counts[poemId] === undefined) counts[poemId] = payload.heart_count;
  });
  return { counts, totalHearts: Number(totalRes.data?.total_hearts) || 0, liked };
}
