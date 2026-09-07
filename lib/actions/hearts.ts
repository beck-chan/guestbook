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

export async function getPoemHeartTotal(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("poem_heart_total")
      .select("total_hearts")
      .maybeSingle();

    if (error) {
      return 0;
    }

    const total = Number(data?.total_hearts ?? 0);
    return Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  } catch {
    return 0;
  }
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
