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
  variant?: "default" | "demobook";
  basePath?: string;
  homeHref?: string;
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
  variant = "default",
  basePath = "/admin",
  homeHref = "/",
}: AdminGuestbookProps) {
  const isDemo = variant === "demobook";

  return (
    <main
      className={`admin-page${isDemo ? " guestbook-page guestbook-mono" : ""}`}
    >
      {isDemo ? (
        <a className="demobook-login" href={homeHref}>
          view guestbook
        </a>
      ) : (
        <>
          <div className="desk-bookmarks">
            <a
              className="desk-bookmark desk-bookmark-labeled"
              href={homeHref}
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
          <a className="admin-book-tab" href={homeHref} aria-label="return to book">
            <span className="admin-book-tab-ribbon" aria-hidden="true">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                <path d="M1.5,40 V9.5 Q1.5,1.5 9.5,1.5 H90.5 Q98.5,1.5 98.5,9.5 V40 Z" />
              </svg>
            </span>
            <span className="admin-book-tab-label">return</span>
          </a>
        </>
      )}
      <div className="admin-shell">
        <AdminFilters filters={filters} basePath={basePath} />
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
            <a className="comment-page" href={adminHref(page - 1, filters, basePath)}>
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
                href={adminHref(item.n, filters, basePath)}
              >
                {item.n}
              </a>
            ),
          )}
          {page < totalPages ? (
            <a className="comment-page" href={adminHref(page + 1, filters, basePath)}>
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
