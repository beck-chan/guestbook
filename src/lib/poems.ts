export type PoemSection = {
  title: string;
  html: string;
};

export type Poem = {
  id: string;
  title: string;
  sections: PoemSection[];
};

export type PoemFlowItem =
  | { kind: "break" }
  | { kind: "line"; html: string };

function poemLineVisible(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);/g, "x")
    .replace(/\s+/g, "");
}

export function poemFlow(html: string): PoemFlowItem[] {
  const parts = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/<br\s*\/?>/gi);
  const items: PoemFlowItem[] = [];
  let swallowBlanks = false;

  parts.forEach((part, partIndex) => {
    if (!poemLineVisible(part)) {
      items.push({ kind: "break" });
      swallowBlanks = true;
      return;
    }

    const lines = part.split("\n");
    let index = 0;
    if (partIndex > 0 && lines[0]?.trim() === "") {
      index = 1;
    }
    while (index < lines.length && lines[index].trim() === "") {
      if (!swallowBlanks) {
        items.push({ kind: "break" });
      }
      index += 1;
    }
    swallowBlanks = false;

    const verse: string[] = [];
    const flush = () => {
      if (verse.length === 0) {
        return;
      }
      const line = verse.join("\n").replace(/\n/g, " ");
      verse.length = 0;
      if (poemLineVisible(line)) {
        items.push({ kind: "line", html: line });
      }
    };
    for (; index < lines.length; index += 1) {
      if (lines[index].trim() === "") {
        flush();
        items.push({ kind: "break" });
      } else {
        verse.push(lines[index]);
      }
    }
    flush();
  });

  while (items[0]?.kind === "break") {
    items.shift();
  }
  while (items.at(-1)?.kind === "break") {
    items.pop();
  }
  return items;
}

export function pickPoemIndex(count: number, except?: number): number {
  if (count <= 0) {
    return 0;
  }
  if (count === 1 || except === undefined) {
    return Math.floor(Math.random() * count);
  }
  let next = except;
  while (next === except) {
    next = Math.floor(Math.random() * count);
  }
  return next;
}
