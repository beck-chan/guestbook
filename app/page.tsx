import { loadPoems } from "@/lib/loadPoems";
import { pickPoemIndex } from "@/lib/poems";
import { PoetryDesk } from "@/components/_desk/PoetryDesk";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export default async function Home() {
  const poems = loadPoems();
  const initialIndex = pickPoemIndex(poems.length);
  const hitCount = await getUniqueVisitors();

  return (
    <PoetryDesk
      poems={poems}
      initialIndex={initialIndex}
      hitCount={hitCount}
    />
  );
}
