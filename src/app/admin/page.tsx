import type { Metadata } from "next";
import { AdminGuestbook } from "@/components/_admin/AdminGuestbook";
import { loadAdminComments } from "@/app/actions/comments";
import {
  countAdminComments,
  filterComments,
  paginateComments,
  sortComments,
  type AdminFilters,
} from "@/lib/comments";
import { GuestbookSettingsShell } from "@/components/_shared/GuestbookSettingsShell";
import { PageReveal } from "@/components/_shared/PageReveal";
import { getPoemHeartTotal } from "@/lib/actions/hearts";
import { flags } from "@/lib/flags";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";

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

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PageReveal>
      <AdminBody searchParams={searchParams} />
    </PageReveal>
  );
}

async function AdminBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = filtersFrom(params);
  const [settings, allComments, totalHearts] = await Promise.all([
    loadGuestbookSettings(),
    loadAdminComments(),
    flags.public ? Promise.resolve(0) : getPoemHeartTotal(),
  ]);
  const { comments, page, totalPages } = paginateComments(
    sortComments(filterComments(allComments, filters), filters.sort),
    pageFrom(params),
  );
  const { totalComments, unreadComments } = countAdminComments(allComments);

  return (
    <GuestbookSettingsShell settings={settings}>
      <AdminGuestbook
        comments={comments}
        page={page}
        totalPages={totalPages}
        filters={filters}
        totalHearts={totalHearts}
        totalComments={totalComments}
        unreadComments={unreadComments}
      />
    </GuestbookSettingsShell>
  );
}
