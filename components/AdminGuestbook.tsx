import { AdminFilters } from "@/components/AdminFilters";
import { MarkReadCheckbox } from "@/components/MarkReadCheckbox";
import {
  adminHref,
  type AdminFilters as FilterState,
  type GuestbookComment,
} from "@/lib/comments";

type AdminGuestbookProps = {
  comments: GuestbookComment[];
  page: number;
  totalPages: number;
  filters: FilterState;
};

function pageItems(page: number, totalPages: number) {
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

export function AdminGuestbook({
  comments,
  page,
  totalPages,
  filters,
}: AdminGuestbookProps) {
  return (
    <main className="admin-page">
      <div className="desk-bookmarks">
        <a
          className="desk-bookmark desk-bookmark-labeled"
          href="/"
          aria-label="view book"
        >
          <span className="desk-bookmark-ribbon" aria-hidden="true" />
          <span className="desk-bookmark-label">
            view
            <br />
            book
          </span>
        </a>
      </div>
      <div className="admin-shell">
        <AdminFilters filters={filters} />
        <div className="comment-thread">
          {comments.length === 0 ? (
            <p className="admin-empty">no comments match.</p>
          ) : (
            comments.map((note) => (
              <article
                key={note.id}
                className={`admin-comment${note.nested ? " is-nested" : ""}`}
              >
                <figure
                  className={`comment-bubble${note.nested ? " is-nested" : ""}`}
                >
                  <figcaption className="comment-meta">
                    <span className="comment-name">{note.name}</span>
                    <time className="comment-time">{note.time}</time>
                  </figcaption>
                  {note.email ? (
                    <p className="admin-comment-email">{note.email}</p>
                  ) : (
                    <p className="admin-comment-email is-missing">no email</p>
                  )}
                  <p className="comment-body">{note.body}</p>
                  <MarkReadCheckbox
                    commentId={note.id}
                    defaultRead={Boolean(note.read)}
                  />
                </figure>
                <nav
                  className="admin-comment-actions"
                  aria-label={`${note.name} comment actions`}
                >
                  <a className="admin-comment-link" href={`#delete-${note.id}`}>
                    delete
                  </a>
                  <a className="admin-comment-link" href={`#edit-${note.id}`}>
                    edit
                  </a>
                </nav>
              </article>
            ))
          )}
        </div>
        <nav className="comment-pages" aria-label="Admin comment pages">
          {page > 1 ? (
            <a className="comment-page" href={adminHref(page - 1, filters)}>
              prev
            </a>
          ) : (
            <span className="comment-page is-disabled">prev</span>
          )}
          {pageItems(page, totalPages).map((item, index) =>
            item.type === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="comment-page is-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : item.n === page ? (
              <span
                key={item.n}
                className="comment-page is-current"
                aria-current="page"
              >
                {item.n}
              </span>
            ) : (
              <a
                key={item.n}
                className="comment-page"
                href={adminHref(item.n, filters)}
              >
                {item.n}
              </a>
            ),
          )}
          {page < totalPages ? (
            <a className="comment-page" href={adminHref(page + 1, filters)}>
              next
            </a>
          ) : (
            <span className="comment-page is-disabled">next</span>
          )}
        </nav>
      </div>
    </main>
  );
}
