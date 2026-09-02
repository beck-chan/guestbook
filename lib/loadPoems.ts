import fs from "node:fs";
import path from "node:path";
import type { Poem } from "@/lib/poems";

function poetryDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "poetry"),
    path.resolve(process.cwd(), "..", "poetry"),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) {
    throw new Error("Could not find the poetry directory.");
  }
  return found;
}

function toHtml(body: string): string {
  return body
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .trim();
}

function parsePoem(file: string, raw: string): Poem {
  const id = file.replace(/\.md$/i, "");
  const text = raw.replace(/^\uFEFF/, "").trim();
  const chunks = text.split(/^##\s+/m).filter((chunk) => chunk.trim().length > 0);

  const sections = chunks.map((chunk) => {
    const newline = chunk.search(/\r?\n/);
    const title = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    const html = toHtml(newline === -1 ? "" : chunk.slice(newline));
    return { title, html };
  });

  if (sections.length === 0) {
    return { id, title: id, sections: [{ title: id, html: toHtml(text) }] };
  }

  return { id, title: sections[0].title, sections };
}

export function loadPoems(): Poem[] {
  const dir = poetryDir();
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) =>
      parsePoem(file, fs.readFileSync(path.join(dir, file), "utf8")),
    );
}
