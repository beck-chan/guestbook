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
  is_read: boolean;
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

/** Formats in the runtime's local timezone, e.g. `2026-Aug-09 / 5:36PM`. */
export function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const year = date.getFullYear();
  const month = MONTHS[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const hour24 = date.getHours();
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${year}-${month}-${day} / ${hour12}:${minutes}${ampm}`;
}

export function mapPublicComment(row: PublicCommentRow): GuestbookComment {
  return {
    id: row.id,
    name: row.display_name,
    body: row.body,
    createdAt: row.created_at,
    time: formatCommentTime(row.created_at),
  };
}

export function mapAdminComment(row: AdminCommentRow): GuestbookComment {
  return {
    ...mapPublicComment(row),
    email: row.email ?? undefined,
    read: Boolean(row.is_read),
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

  const match = note.time.match(
    /^(\d{4})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) \/ (\d{1,2}):(\d{2})(AM|PM)$/,
  );
  if (match) {
    const [, year, month, day, hourRaw, minute, ampm] = match;
    let hour = Number(hourRaw) % 12;
    if (ampm === "PM") {
      hour += 12;
    }
    return new Date(
      Number(year),
      MONTH_INDEX[month],
      Number(day),
      hour,
      Number(minute),
      0,
    );
  }
  return new Date(NaN);
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

