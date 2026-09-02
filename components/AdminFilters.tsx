"use client";

import { useRouter } from "next/navigation";
import { adminHref, type AdminFilters } from "@/lib/comments";

export function AdminFilters({ filters }: { filters: AdminFilters }) {
  const router = useRouter();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const emailValue = String(data.get("email") ?? "all");
    const statusValue = String(data.get("status") ?? "all");
    router.push(
      adminHref(1, {
        q: String(data.get("q") ?? "").trim(),
        status:
          statusValue === "unread" || statusValue === "read"
            ? statusValue
            : "all",
        email:
          emailValue === "has" || emailValue === "none" ? emailValue : "all",
        from: String(data.get("from") ?? ""),
        to: String(data.get("to") ?? ""),
      }),
    );
  }

  return (
    <form
      className="admin-filters"
      key={`${filters.q}|${filters.status}|${filters.email}|${filters.from}|${filters.to}`}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
    >
      <div className="admin-header">
        <h1 className="admin-title">admin</h1>
        <div className="admin-filter-row">
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
      </div>
      <div className="admin-search-row">
        <p className="admin-lede">posted comments, newest first.</p>
        <input
          className="admin-filter admin-filter-search"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="search"
          aria-label="search comments"
        />
      </div>
    </form>
  );
}
