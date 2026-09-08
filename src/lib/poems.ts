export type PoemSection = {
  title: string;
  html: string;
};

export type Poem = {
  id: string;
  title: string;
  sections: PoemSection[];
};

function decodePoemHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&emsp;/g, "\u2003")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function poemMeasureLines(poem: Poem) {
  const lines: Array<{ text: string; weight: 400 | 700; scale: number }> = [];
  for (const section of poem.sections) {
    if (section.title) {
      lines.push({ text: section.title, weight: 700, scale: 1.22 });
    }
    for (const line of decodePoemHtml(section.html).split("\n")) {
      if (line.length > 0) {
        lines.push({ text: line, weight: 400, scale: 1 });
      }
    }
  }
  return lines;
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
