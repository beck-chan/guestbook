import { loadPoems } from "@/lib/loadPoems";
import { pickPoemIndex } from "@/lib/poems";
import { PoetryDesk } from "@/components/_desk/PoetryDesk";
import { getDeskHeartSeed } from "@/lib/actions/hearts";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export default async function Home() {
  const poems = loadPoems();
  const initialIndex = pickPoemIndex(poems.length);
  const [hitCount, heartSeed] = await Promise.all([
    getUniqueVisitors(),
    getDeskHeartSeed(poems[initialIndex]?.id ?? ""),
  ]);

  return (
    <PoetryDesk
      poems={poems}
      initialIndex={initialIndex}
      hitCount={hitCount}
      initialHeart={heartSeed.initialHeart}
      heartCounts={heartSeed.heartCounts}
    />
  );
}
