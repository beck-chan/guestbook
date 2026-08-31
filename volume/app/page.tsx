import { loadPoems } from "@/lib/loadPoems";
import { pickPoemIndex } from "@/lib/poems";
import { PoetryDesk } from "@/components/PoetryDesk";

export default function Home() {
  const poems = loadPoems();
  const initialIndex = pickPoemIndex(poems.length);

  return <PoetryDesk poems={poems} initialIndex={initialIndex} />;
}
