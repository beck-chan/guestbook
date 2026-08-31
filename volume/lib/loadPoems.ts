import fs from "node:fs";
import path from "node:path";
import type { Poem } from "@/lib/poems";

function poetryDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "..", "poetry"),
    path.resolve(process.cwd(), "poetry"),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) {
    throw new Error("Could not find the poetry directory.");
  }
  return found;
}

function parsePoem(file: string, raw: string): Poem {
  const id = file.replace(/\.md$/i, "");
  const titleMatch = raw.match(/\*\*([^*]+)\*\*/);
  const title = titleMatch?.[1].trim() ?? id;
  let body = raw.replace(/^\s*\*\*[^*]+\*\*\s*/, "");
  body = body.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return { id, title, html: body.trim() };
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
