import type { Metadata } from "next";
import { AdminGuestbook } from "@/components/AdminGuestbook";
import {
  MOCK_COMMENTS,
  filterComments,
  paginateComments,
  type AdminFilters,
} from "@/lib/comments";

export const metadata: Metadata = {
  title: "y2k admin",
  description: "Guestbook comments, newest first.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filtersFrom(
  searchParams: Record<string, string | string[] | undefined>,
): AdminFilters {
  const email = first(searchParams.email);
  const status = first(searchParams.status);
  return {
    q: first(searchParams.q) ?? "",
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

export default async function DemobookAdminPage({
  searchParams,
}: PageProps<"/demobook/admin">) {
  const params = await searchParams;
  const filters = filtersFrom(params);
  const { comments, page, totalPages } = paginateComments(
    filterComments(MOCK_COMMENTS, filters),
    pageFrom(params),
  );

  return (
    <AdminGuestbook
      variant="demobook"
      basePath="/demobook/admin"
      homeHref="/demobook"
      comments={comments}
      page={page}
      totalPages={totalPages}
      filters={filters}
    />
  );
}
