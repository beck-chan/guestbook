import { loadPoems } from "../src/lib/loadPoems";
import { poemFlow } from "../src/lib/poems";

const ids = [
  "ode-to-peonies",
  "derelict-dog-star",
  "future",
  "past",
  "persimmons",
  "porphyrogeniture",
  "24-guests",
];
const poems = loadPoems();
for (const id of ids) {
  const poem = poems.find((item) => item.id === id);
  if (!poem) continue;
  for (const section of poem.sections) {
    const items = poemFlow(section.html);
    console.log("\n==", id, section.title);
    items.forEach((item, index) => {
      const label =
        item.kind === "break"
          ? "(blank)"
          : item.html.replace(/<[^>]+>/g, "").slice(0, 42);
      console.log(String(index + 1).padStart(3), label);
    });
  }
}
