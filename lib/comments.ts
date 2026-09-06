export type GuestbookComment = {
  id: string;
  name: string;
  email?: string;
  body: string;
  time: string;
  createdAt?: string;
  nested?: boolean;
  read?: boolean;
};

export type PublicCommentRow = {
  id: string;
  display_name: string;
  body: string;
  created_at: string;
  updated_at?: string;
};

export type AdminCommentRow = PublicCommentRow & {
  email: string | null;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatCommentTime(iso: string, now = Date.now()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const diffMs = now - date.getTime();
  if (diffMs < 60_000) {
    return "just now";
  }
  if (diffMs < 86_400_000) {
    const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
    return `${hours}h ago`;
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  if (date >= startOfYesterday && date < startOfToday) {
    return "yesterday";
  }

  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function mapPublicComment(
  row: PublicCommentRow,
  now = Date.now(),
): GuestbookComment {
  return {
    id: row.id,
    name: row.display_name,
    body: row.body,
    createdAt: row.created_at,
    time: formatCommentTime(row.created_at, now),
  };
}

export function mapAdminComment(
  row: AdminCommentRow,
  now = Date.now(),
): GuestbookComment {
  return {
    ...mapPublicComment(row, now),
    email: row.email ?? undefined,
  };
}

export const ADMIN_PAGE_SIZE = 10;

export type EmailFilter = "all" | "has" | "none";
export type StatusFilter = "all" | "unread" | "read";
export type SortOrder = "newest" | "oldest";

export type AdminFilters = {
  q: string;
  sort: SortOrder;
  status: StatusFilter;
  email: EmailFilter;
  from: string;
  to: string;
};

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function commentDate(note: GuestbookComment): Date {
  if (note.createdAt) {
    const parsed = new Date(note.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const { time } = note;
  if (time === "just now") {
    return new Date(2026, 8, 2, 12, 0, 0);
  }
  if (time.endsWith("h ago") || time.endsWith("m ago")) {
    return new Date(2026, 8, 2, 10, 0, 0);
  }
  if (time === "yesterday") {
    return new Date(2026, 8, 1, 12, 0, 0);
  }
  const match = time.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/,
  );
  if (match) {
    return new Date(2026, MONTH_INDEX[match[1]], Number(match[2]), 12, 0, 0);
  }
  return new Date(2026, 8, 2, 12, 0, 0);
}

export function filterComments(
  comments: GuestbookComment[],
  filters: AdminFilters,
): GuestbookComment[] {
  const needle = filters.q.trim().toLowerCase();
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;

  return comments.filter((note) => {
    if (filters.status === "unread" && note.read) {
      return false;
    }
    if (filters.status === "read" && !note.read) {
      return false;
    }
    if (filters.email === "has" && !note.email) {
      return false;
    }
    if (filters.email === "none" && note.email) {
      return false;
    }
    if (needle) {
      const haystack =
        `${note.name} ${note.email ?? ""} ${note.body}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    if (from || to) {
      const posted = commentDate(note);
      if (from && posted < from) {
        return false;
      }
      if (to && posted > to) {
        return false;
      }
    }
    return true;
  });
}

export function sortComments(
  comments: GuestbookComment[],
  sort: SortOrder,
): GuestbookComment[] {
  return [...comments].sort((a, b) => {
    const delta = commentDate(a).getTime() - commentDate(b).getTime();
    return sort === "oldest" ? delta : -delta;
  });
}

export function adminHref(
  page: number,
  filters: AdminFilters,
  basePath = "/admin",
) {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.sort === "oldest") {
    params.set("sort", "oldest");
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.email !== "all") {
    params.set("email", filters.email);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function paginateComments(comments: GuestbookComment[], page: number) {
  const totalPages = Math.max(1, Math.ceil(comments.length / ADMIN_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * ADMIN_PAGE_SIZE;

  return {
    comments: comments.slice(start, start + ADMIN_PAGE_SIZE),
    page: current,
    totalPages,
  };
}

export function publicPageItems(page: number, totalPages: number) {
  const items: Array<{ type: "page"; n: number } | { type: "ellipsis" }> = [
    { type: "page", n: 1 },
  ];

  if (totalPages <= 1) {
    return items;
  }

  if (page !== 1 && page !== totalPages) {
    items.push({ type: "ellipsis" });
    items.push({ type: "page", n: page });
    items.push({ type: "ellipsis" });
  } else {
    items.push({ type: "ellipsis" });
  }

  items.push({ type: "page", n: totalPages });
  return items;
}


/** Kept for local UI demos; admin/public paths load from Supabase. */
export const MOCK_COMMENTS: GuestbookComment[] = [];
