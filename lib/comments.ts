export type GuestbookComment = {
  id: string;
  name: string;
  email?: string;
  body: string;
  time: string;
  nested?: boolean;
  read?: boolean;
};

/** Newest first. Public guestbook shows a page of these; admin shows the full list. */
const MOCK_COMMENT_SEED: GuestbookComment[] = [
  {
    id: "a-guest-doorway",
    name: "a guest",
    email: "aguest@example.com",
    body: "this one stopped me in the doorway.",
    time: "just now",
  },
  {
    id: "m-exhaling",
    name: "m.",
    body: "turning the page felt like exhaling.",
    time: "2h ago",
    nested: true,
  },
  {
    id: "anon-last-line",
    name: "anon",
    email: "anon.keeps@example.net",
    body: "i keep coming back to the last line.",
    time: "yesterday",
  },
  {
    id: "june-peonies",
    name: "june",
    email: "june@example.com",
    body: "left it open on the kitchen table. the peonies did the rest.",
    time: "Aug 28",
    nested: true,
  },
  {
    id: "willow-dogear",
    name: "willow",
    email: "willow.reads@example.com",
    body: "the dog-ear is my favorite part. i keep meaning to close it and then i don't.",
    time: "Aug 20",
  },
  {
    id: "k-twice",
    name: "k",
    body: "read it twice. then once more.",
    time: "Aug 12",
    nested: true,
  },
  {
    id: "visitor-open",
    name: "visitor",
    email: "hello@visitor.example",
    body: "thank you for leaving it open.",
    time: "Aug 3",
  },
  {
    id: "lea-cream",
    name: "lea",
    email: "lea@example.com",
    body: "the cream pages feel like a held breath.",
    time: "Jul 29",
  },
  {
    id: "n-corner",
    name: "n.",
    body: "i dog-eared the corner and then felt guilty about it.",
    time: "Jul 22",
    nested: true,
  },
  {
    id: "rio-twice",
    name: "rio",
    email: "rio.notes@example.net",
    body: "came back the next morning and it still held.",
    time: "Jul 14",
  },
  {
    id: "s-quiet",
    name: "s",
    body: "quiet on purpose. i needed that.",
    time: "Jul 6",
    nested: true,
  },
  {
    id: "harper-spread",
    name: "harper",
    email: "harper@example.org",
    body: "the two-page spread is doing more work than it lets on.",
    time: "Jun 28",
  },
  {
    id: "bo-ink",
    name: "bo",
    body: "left a fingerprint of ink on the desk. sorry. not sorry.",
    time: "Jun 19",
    nested: true,
  },
  {
    id: "ellen-again",
    name: "ellen",
    email: "ellen.reads@example.com",
    body: "read it aloud to the empty kitchen.",
    time: "Jun 11",
  },
  {
    id: "t-pause",
    name: "t.",
    body: "the pause after the last line is the poem.",
    time: "Jun 2",
    nested: true,
  },
  {
    id: "mina-foil",
    name: "mina",
    email: "mina@example.com",
    body: "the foil on the cover caught the late light just so.",
    time: "May 24",
  },
  {
    id: "guest-2",
    name: "a guest",
    body: "signed it because the sticky note told me to.",
    time: "May 15",
    nested: true,
  },
  {
    id: "owen-desk",
    name: "owen",
    email: "owen.p@example.net",
    body: "this desk feels like a room i already knew.",
    time: "May 7",
  },
  {
    id: "p-again",
    name: "p",
    body: "another pass. still catching on the same line.",
    time: "Apr 28",
    nested: true,
  },
  {
    id: "iris-void",
    name: "iris",
    email: "iris@example.com",
    body: "thoughts into the void, as requested.",
    time: "Apr 16",
  },
  {
    id: "cal-kind",
    name: "cal",
    body: "trying to be kind. it is harder than the page makes it look.",
    time: "Apr 4",
    nested: true,
  },
  {
    id: "yarrow-first",
    name: "yarrow",
    email: "yarrow.leaf@example.org",
    body: "first visit. i will be back.",
    time: "Mar 22",
  },
  {
    id: "old-friend",
    name: "an old friend",
    email: "stillhere@example.com",
    body: "found this the way one finds a letter in a coat pocket.",
    time: "Mar 9",
  },
];

export const MOCK_COMMENTS: GuestbookComment[] = MOCK_COMMENT_SEED.map(
  (note, index) => ({
    ...note,
    nested: index % 2 === 1,
    read: index >= 4,
  }),
);

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

const MONTHS: Record<string, number> = {
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
  const { time } = note;
  if (time === "just now") {
    return new Date(2026, 8, 2, 12, 0, 0);
  }
  if (time === "2h ago") {
    return new Date(2026, 8, 2, 10, 0, 0);
  }
  if (time === "yesterday") {
    return new Date(2026, 8, 1, 12, 0, 0);
  }
  const match = time.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/,
  );
  if (match) {
    return new Date(2026, MONTHS[match[1]], Number(match[2]), 12, 0, 0);
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
      const haystack = `${note.name} ${note.email ?? ""} ${note.body}`.toLowerCase();
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
