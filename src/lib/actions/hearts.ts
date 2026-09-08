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

function asCount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
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

    return asCount(data?.total_hearts);
  } catch {
    return 0;
  }
}

export type DeskHeartSeed = {
  heartCounts: Record<string, number>;
  initialHeart: PoemHeartState;
};

export async function getDeskHeartSeed(poemId: string): Promise<DeskHeartSeed> {
  const empty: PoemHeartState = {
    liked: false,
    heart_count: 0,
    total_hearts: 0,
  };
  const trimmed = poemId.trim();

  try {
    const cookieStore = await cookies();
    const visitorKey = cookieStore.get(VISITOR_COOKIE)?.value?.trim() ?? "";
    const supabase = await createClient();

    const [countsRes, totalRes, stateRes] = await Promise.all([
      supabase.from("poem_heart_counts").select("poem_id, heart_count"),
      supabase.from("poem_heart_total").select("total_hearts").maybeSingle(),
      trimmed
        ? supabase.rpc("poem_heart_state", {
            p_poem_id: trimmed,
            p_visitor_key: visitorKey,
          })
        : Promise.resolve({ data: null, error: null }),
    ]);

    const heartCounts: Record<string, number> = {};
    if (!countsRes.error && countsRes.data) {
      for (const row of countsRes.data) {
        const id = typeof row.poem_id === "string" ? row.poem_id.trim() : "";
        const count = asCount(row.heart_count);
        if (id && count > 0) {
          heartCounts[id] = count;
        }
      }
    }

    const fromRpc = stateRes.error ? empty : asHeartState(stateRes.data);
    const initialHeart: PoemHeartState = {
      liked: fromRpc.liked,
      heart_count: fromRpc.heart_count || heartCounts[trimmed] || 0,
      total_hearts: fromRpc.total_hearts || asCount(totalRes.data?.total_hearts),
    };

    return { heartCounts, initialHeart };
  } catch {
    return { heartCounts: {}, initialHeart: empty };
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
