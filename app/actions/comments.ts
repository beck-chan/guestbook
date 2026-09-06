"use server";

import { revalidatePath } from "next/cache";
import {
  mapAdminComment,
  mapPublicComment,
  type AdminCommentRow,
  type GuestbookComment,
  type PublicCommentRow,
} from "@/lib/comments";
import { guestbookPageSize } from "@/lib/guestbookSettingsShared";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";
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
): Promise<PublicCommentsPage> {
  const settings = await loadGuestbookSettings();
  const pageSize = guestbookPageSize(settings.pageSize);
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
  const now = Date.now();

  return {
    comments: ((data ?? []) as PublicCommentRow[]).map((row) =>
      mapPublicComment(row, now),
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

  if (!name) {
    return { ok: false, error: "Display name is required." };
  }
  if (!body) {
    return { ok: false, error: "Comment is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    display_name: name,
    email: email || null,
    body,
  });

  if (error) {
    return { ok: false, error: requireAdminMessage(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/guestbook");
  revalidatePath("/admin");
  return { ok: true };
}

export async function loadAdminComments(): Promise<GuestbookComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, display_name, email, body, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const now = Date.now();
  return (data as AdminCommentRow[]).map((row) => mapAdminComment(row, now));
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
  revalidatePath("/admin");
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
  revalidatePath("/admin");
  return { ok: true };
}
