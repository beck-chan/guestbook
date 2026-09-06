import type { Metadata } from "next";
import { AdminGuestbook } from "@/components/_admin/AdminGuestbook";
import { loadAdminComments } from "@/app/actions/comments";
import {
  filterComments,
  paginateComments,
  sortComments,
  type AdminFilters,
} from "@/lib/comments";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Comment moderation & settings.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filtersFrom(
  searchParams: Record<string, string | string[] | undefined>,
): AdminFilters {
  const email = first(searchParams.email);
  const status = first(searchParams.status);
  const sort = first(searchParams.sort);
  return {
    q: first(searchParams.q) ?? "",
    sort: sort === "oldest" ? "oldest" : "newest",
    status: status === "unread" || status === "read" ? status : "all",
    email: email === "has" || email === "none" ? email : "all",
    from: first(searchParams.from) ?? "",
    to: first(searchParams.to) ?? "",
  };
}

function pageFrom(searchParams: Record<string, string | string[] | undefined>) {
  const parsed = Number.parseInt(first(searchParams.page) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const filters = filtersFrom(params);
  const allComments = await loadAdminComments();
  const { comments, page, totalPages } = paginateComments(
    sortComments(filterComments(allComments, filters), filters.sort),
    pageFrom(params),
  );

  return (
    <AdminGuestbook
      comments={comments}
      page={page}
      totalPages={totalPages}
      filters={filters}
    />
  );
}
