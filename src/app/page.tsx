import { getPublicCommentsPage } from "@/app/actions/comments";
import { loadPoems } from "@/lib/loadPoems";
import { pickPoemIndex } from "@/lib/poems";
import { EmailCaptureHydrator } from "@/components/_desk/EmailCaptureHydrator";
import { PoetryDesk } from "@/components/_desk/PoetryDesk";
import { getDeskHeartSeed } from "@/lib/actions/hearts";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

const DESK_COMMENT_PAGE_SIZE = 4;

export default async function Home() {
  const poems = loadPoems();
  const initialIndex = pickPoemIndex(poems.length);
  const [hitCount, heartSeed, commentsPage] = await Promise.all([
    getUniqueVisitors(),
    getDeskHeartSeed(poems[initialIndex]?.id ?? ""),
    getPublicCommentsPage(1, DESK_COMMENT_PAGE_SIZE),
  ]);

  return (
    <>
      <EmailCaptureHydrator />
      <PoetryDesk
        poems={poems}
        initialIndex={initialIndex}
        hitCount={hitCount}
        initialHeart={heartSeed.initialHeart}
        heartCounts={heartSeed.heartCounts}
        initialComments={commentsPage.comments}
        initialPage={commentsPage.page}
        initialTotalPages={commentsPage.totalPages}
        commentPageSize={commentsPage.pageSize}
      />
    </>
  );
}
