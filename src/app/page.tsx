import { getPublicCommentsPage } from "@/app/actions/comments";
import { loadPoems } from "@/lib/loadPoems";
import { pickPoemIndex } from "@/lib/poems";
import { EmailCaptureHydrator } from "@/components/_desk/EmailCaptureHydrator";
import { PoetryDesk } from "@/components/_desk/PoetryDesk";
import { PageReveal } from "@/components/_shared/PageReveal";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

const DESK_COMMENT_PAGE_SIZE = 4;

export default function Home() {
  return (
    <PageReveal>
      <HomeDesk />
    </PageReveal>
  );
}

async function HomeDesk() {
  const poems = loadPoems();
  const initialIndex = pickPoemIndex(poems.length);
  const [hitCount, commentsPage] = await Promise.all([
    getUniqueVisitors(),
    getPublicCommentsPage(1, DESK_COMMENT_PAGE_SIZE),
  ]);

  return (
    <>
      <EmailCaptureHydrator />
      <PoetryDesk
        poems={poems}
        initialIndex={initialIndex}
        hitCount={hitCount}
        initialComments={commentsPage.comments}
        initialPage={commentsPage.page}
        initialTotalPages={commentsPage.totalPages}
        commentPageSize={commentsPage.pageSize}
      />
    </>
  );
}
