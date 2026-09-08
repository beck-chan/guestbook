import { AdminCommentThread } from "@/components/_admin/AdminCommentThread";
import { AdminFilters } from "@/components/_admin/AdminFilters";
import { AdminPageFrame } from "@/components/_admin/AdminPageFrame";
import { AdminSettings } from "@/components/_admin/AdminSettings";
import {
  adminHref,
  type AdminFilters as FilterState,
  type GuestbookComment,
} from "@/lib/comments";
import { guestbookAdminPath } from "@/lib/guestbookPaths";

type AdminGuestbookProps = {
  comments: GuestbookComment[];
  page: number;
  totalPages: number;
  filters: FilterState;
  totalHearts?: number;
  basePath?: string;
  homeHref?: string;
};

export function AdminGuestbook({
  comments,
  page,
  totalPages,
  filters,
  totalHearts = 0,
  basePath = guestbookAdminPath(),
  homeHref = "/",
}: AdminGuestbookProps) {
  return (
    <AdminPageFrame className="admin-page admin-desk">
      <a className="admin-book-tab" href={homeHref} aria-label="return to book">
        <span className="admin-book-tab-ribbon" aria-hidden="true">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M1.5,40 V9.5 Q1.5,1.5 9.5,1.5 H90.5 Q98.5,1.5 98.5,9.5 V40 Z" />
          </svg>
        </span>
        <span className="admin-book-tab-label">return</span>
      </a>
      <div className="desk-split">
        <section className="admin-main" aria-label="Comments">
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
          <div className="admin-shell">
            <AdminFilters
              filters={filters}
              basePath={basePath}
              totalHearts={totalHearts}
            />
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
              <span className="comment-page is-status" aria-current="page">
                <span className="comment-page-current">{page}</span>
                {" / "}
                {totalPages}
              </span>
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
