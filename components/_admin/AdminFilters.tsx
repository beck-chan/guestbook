"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminHref, type AdminFilters } from "@/lib/comments";
import { guestbookAdminPath } from "@/lib/guestbookPaths";

export function AdminFilters({
  filters,
  basePath = guestbookAdminPath(),
}: {
  filters: AdminFilters;
  basePath?: string;
}) {
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [query, setQuery] = useState(filters.q);

  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const emailValue = String(data.get("email") ?? "all");
    const statusValue = String(data.get("status") ?? "all");
    const sortValue = String(data.get("sort") ?? "newest");
    router.push(
      adminHref(
        1,
        {
          q: String(data.get("q") ?? "").trim(),
          sort: sortValue === "oldest" ? "oldest" : "newest",
          status:
            statusValue === "unread" || statusValue === "read"
              ? statusValue
              : "all",
          email:
            emailValue === "has" || emailValue === "none" ? emailValue : "all",
          from: String(data.get("from") ?? ""),
          to: String(data.get("to") ?? ""),
        },
        basePath,
      ),
    );
  }

  return (
    <form
      className="admin-filters"
      key={`${filters.q}|${filters.sort}|${filters.status}|${filters.email}|${filters.from}|${filters.to}`}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
    >
      <div className={`admin-tools${toolsOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="admin-tools-toggle"
          aria-expanded={toolsOpen}
          aria-controls="admin-tools-panel"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setToolsOpen((open) => !open)}
        >
          comments menu
          <span className="admin-tools-caret" aria-hidden="true" />
        </button>
        <div id="admin-tools-panel" className="admin-tools-panel">
          <div className="admin-tools-panel-inner">
            <div className="admin-filter-row">
              <select
                className="admin-filter admin-filter-select"
                name="sort"
                defaultValue={filters.sort}
                aria-label="sort comments"
                onChange={(event) => {
                  if (event.currentTarget.form) {
                    apply(event.currentTarget.form);
                  }
                }}
              >
                <option value="oldest">oldest first</option>
                <option value="newest">newest first</option>
              </select>
              <select
                className="admin-filter admin-filter-select"
                name="status"
                defaultValue={filters.status}
                aria-label="filter by status"
                onChange={(event) => {
                  if (event.currentTarget.form) {
                    apply(event.currentTarget.form);
                  }
                }}
              >
                <option value="all">status</option>
                <option value="unread">unread</option>
                <option value="read">read</option>
              </select>
              <select
                className="admin-filter admin-filter-select"
                name="email"
                defaultValue={filters.email}
                aria-label="filter by contact"
                onChange={(event) => {
                  if (event.currentTarget.form) {
                    apply(event.currentTarget.form);
                  }
                }}
              >
                <option value="all">contact</option>
                <option value="has">has email</option>
                <option value="none">no email</option>
              </select>
              <div className="admin-date-range">
                <input
                  className="admin-filter admin-filter-date"
                  type="date"
                  name="from"
                  defaultValue={filters.from}
                  aria-label="from date"
                  onChange={(event) => {
                    if (event.currentTarget.form) {
                      apply(event.currentTarget.form);
                    }
                  }}
                />
                <span className="admin-date-range-sep" aria-hidden="true">
                  –
                </span>
                <input
                  className="admin-filter admin-filter-date"
                  type="date"
                  name="to"
                  defaultValue={filters.to}
                  aria-label="to date"
                  onChange={(event) => {
                    if (event.currentTarget.form) {
                      apply(event.currentTarget.form);
                    }
                  }}
                />
              </div>
            </div>
            <div className="admin-search-row">
              <Link
                className="admin-comment-link"
                href={basePath}
                scroll={false}
                onClick={() => setQuery("")}
              >
                clear all
              </Link>
              <input
                className="admin-filter admin-filter-search"
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="search"
                aria-label="search comments"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="admin-header">
        <h1 className="admin-title">comments</h1>
      </div>
      <p className="admin-lede">
        posted comments, {filters.sort === "oldest" ? "oldest first" : "newest first"}.
      </p>
    </form>
  );
}
