import { AdminCommentThread } from "@/components/AdminCommentThread";
import { AdminFilters } from "@/components/AdminFilters";
import { AdminPageFrame } from "@/components/AdminPageFrame";
import { AdminSettings } from "@/components/AdminSettings";
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
    <AdminPageFrame
      className={`admin-page${isDemo ? " guestbook-page guestbook-mono" : " admin-desk"}`}
    >
      {isDemo ? (
        <a className="demobook-login" href={homeHref}>
          view guestbook
        </a>
      ) : (
        <a className="admin-book-tab" href={homeHref} aria-label="return to book">
          <span className="admin-book-tab-ribbon" aria-hidden="true">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M1.5,40 V9.5 Q1.5,1.5 9.5,1.5 H90.5 Q98.5,1.5 98.5,9.5 V40 Z" />
            </svg>
          </span>
          <span className="admin-book-tab-label">return</span>
        </a>
      )}
      <div className="desk-split">
        <section className="admin-main" aria-label="Comments">
          {isDemo ? null : (
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
          )}
          <div className="admin-shell">
            <AdminFilters filters={filters} basePath={basePath} />
            <AdminCommentThread
              key={comments.map((note) => note.id).join("|")}
              comments={comments}
            />
            <nav className="comment-pages" aria-label="Admin comment pages">
              {page > 1 ? (
                <a
                  className="comment-page"
                  href={adminHref(page - 1, filters, basePath)}
                >
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
                <a
                  className="comment-page"
                  href={adminHref(page + 1, filters, basePath)}
                >
                  next
                </a>
              ) : (
                <span className="comment-page is-disabled">next</span>
              )}
            </nav>
          </div>
        </section>
        <aside className="desk-side admin-settings" aria-label="Settings">
          <AdminSettings />
        </aside>
      </div>
    </AdminPageFrame>
  );
}
