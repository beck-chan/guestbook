import { loadPoems } from "@/lib/loadPoems";
import { pickPoemIndex } from "@/lib/poems";
import { PoetryDesk } from "@/components/_desk/PoetryDesk";
import { getPoemHeartTotal } from "@/lib/actions/hearts";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export default async function Home() {
  const poems = loadPoems();
  const initialIndex = pickPoemIndex(poems.length);
  const [hitCount, totalHearts] = await Promise.all([
    getUniqueVisitors(),
    getPoemHeartTotal(),
  ]);

  return (
    <PoetryDesk
      poems={poems}
      initialIndex={initialIndex}
      hitCount={hitCount}
      totalHearts={totalHearts}
    />
  );
}
