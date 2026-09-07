"use server";

import { revalidatePath } from "next/cache";
import {
  mapAdminComment,
  mapPublicComment,
  type AdminCommentRow,
  type GuestbookComment,
  type PublicCommentRow,
} from "@/lib/comments";
import { guestbookAdminPath } from "@/lib/guestbookPaths";
import { guestbookPageSize } from "@/lib/guestbookSettingsShared";
import { clientIp } from "@/lib/clientIp";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";
import { commentLengthError } from "@/lib/commentLimits";
import {
  checkCommentProfanity,
  profanityErrorMessage,
} from "@/lib/profanity";
import { consumeCommentRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type PublicCommentsPage = {
  comments: GuestbookComment[];
  page: number;
  totalPages: number;
  pageSize: number;
};

function requireAdminMessage(error: string | undefined) {
  return error ?? "Something went wrong.";
}

export async function getPublicCommentsPage(
  page = 1,
  pageSizeOverride?: number,
): Promise<PublicCommentsPage> {
  const settings = await loadGuestbookSettings();
  const pageSize =
    typeof pageSizeOverride === "number" && pageSizeOverride > 0
      ? Math.floor(pageSizeOverride)
      : guestbookPageSize(settings.pageSize);
  const current = Math.max(1, page);
  const from = (current - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("comments_public")
    .select("id, display_name, body, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      comments: [],
      page: 1,
      totalPages: 1,
      pageSize,
    };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(current, totalPages);

  return {
    comments: ((data ?? []) as PublicCommentRow[]).map((row) =>
      mapPublicComment(row),
    ),
    page: safePage,
    totalPages,
    pageSize,
  };
}

export async function submitComment(input: {
  name: string;
  email?: string;
  comment: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const body = input.comment.trim();
  const email = input.email?.trim() ?? "";

  // load settings → validate → profanity → rate-limit → insert
  const settings = await loadGuestbookSettings();

  if (!name) {
    return { ok: false, error: "Display name is required." };
  }
  if (!body) {
    return { ok: false, error: "Comment is required." };
  }
  const lengthError = commentLengthError(
    name,
    email,
    body,
    settings.commentLength,
  );
  if (lengthError) {
    return { ok: false, error: lengthError };
  }

  const hit = checkCommentProfanity(name, body, settings.profanityAllowList);
  const profanityError = profanityErrorMessage(hit);
  if (profanityError) {
    return { ok: false, error: profanityError };
  }

  try {
    const limited = await consumeCommentRateLimit(await clientIp(), settings);
    if (!limited.ok) {
      return limited;
    }
  } catch (err) {
    console.error("rate limit failed:", err);
    const detail = err instanceof Error ? err.message : "";
    if (/DATABASE_URL/i.test(detail)) {
      return {
        ok: false,
        error:
          "Comment posting is temporarily unavailable (DATABASE_URL is missing or invalid).",
      };
    }
    return {
      ok: false,
      error: "Comment posting is temporarily unavailable. Please try again later.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    display_name: name,
    email: email || null,
    body,
  });

  // If insert fails after consume, the rate-limit point stays spent (no refund).
  if (error) {
    return { ok: false, error: requireAdminMessage(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/guestbook");
  revalidatePath(guestbookAdminPath());
  return { ok: true };
}

export async function loadAdminComments(): Promise<GuestbookComment[]> {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("comments")
    .select("id, display_name, email, body, is_read, created_at, updated_at")
    .order("created_at", { ascending: false });

  // Fallback if the live DB has not been altered yet.
  if (error && /is_read|column/i.test(error.message)) {
    const fallback = await supabase
      .from("comments")
      .select("id, display_name, email, body, created_at, updated_at")
      .order("created_at", { ascending: false });
    data = (fallback.data ?? []).map((row) => ({ ...row, is_read: false }));
    error = fallback.error;
  }

  if (error || !data) {
    console.error("loadAdminComments failed:", error?.message);
    return [];
  }

  return (data as AdminCommentRow[]).map((row) => mapAdminComment(row));
}

export async function updateComment(input: {
  id: string;
  name: string;
  email?: string;
  body: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const body = input.body.trim();
  const email = input.email?.trim() ?? "";

  if (!input.id) {
    return { ok: false, error: "Comment id is required." };
  }
  if (!name) {
    return { ok: false, error: "Display name is required." };
  }
  if (!body) {
    return { ok: false, error: "Comment is required." };
  }
  const settings = await loadGuestbookSettings();
  const lengthError = commentLengthError(
    name,
    email,
    body,
    settings.commentLength,
  );
  if (lengthError) {
    return { ok: false, error: lengthError };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .update({
      display_name: name,
      email: email || null,
      body,
    })
    .eq("id", input.id);

  if (error) {
    return { ok: false, error: requireAdminMessage(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/guestbook");
  revalidatePath(guestbookAdminPath());
  return { ok: true };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  if (!id) {
    return { ok: false, error: "Comment id is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) {
    return { ok: false, error: requireAdminMessage(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/guestbook");
  revalidatePath(guestbookAdminPath());
  return { ok: true };
}

export async function setCommentRead(
  id: string,
  read: boolean,
): Promise<ActionResult> {
  if (!id) {
    return { ok: false, error: "Comment id is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .update({ is_read: read })
    .eq("id", id);

  if (error) {
    return { ok: false, error: requireAdminMessage(error.message) };
  }

  revalidatePath(guestbookAdminPath());
  return { ok: true };
}

export async function setCommentsRead(
  ids: string[],
  read: boolean,
): Promise<ActionResult> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .update({ is_read: read })
    .in("id", uniqueIds);

  if (error) {
    return { ok: false, error: requireAdminMessage(error.message) };
  }

  revalidatePath(guestbookAdminPath());
  return { ok: true };
}
