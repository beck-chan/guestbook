import type { GuestbookComment } from "@/lib/comments";

export type CommentRow = {
  id: string;
  display_name: string;
  email: string | null;
  body: string;
  created_at: string;
  updated_at?: string;
};

export function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = Date.now();
  const deltaMs = now - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (deltaMs < minute) return "just now";
  if (deltaMs < hour) {
    const n = Math.max(1, Math.round(deltaMs / minute));
    return `${n}m ago`;
  }
  if (deltaMs < day) {
    const n = Math.max(1, Math.round(deltaMs / hour));
    return `${n}h ago`;
  }
  if (deltaMs < 2 * day) return "yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function mapCommentRow(
  row: CommentRow,
  options?: { nested?: boolean },
): GuestbookComment {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email ?? undefined,
    body: row.body,
    time: formatCommentTime(row.created_at),
    createdAt: row.created_at,
    nested: options?.nested,
  };
}
