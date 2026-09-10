import { getDocsCorpus, type ComposedDoc } from "./compose";

export function getComposedDocBySlug(slug: string): ComposedDoc | undefined {
  const normalized = slug
    .replace(/\.md$/i, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/");
  if (!normalized || normalized.split("/").includes("..")) {
    return undefined;
  }
  return getDocsCorpus().find((doc) => doc.slug === normalized);
}

/**
 * llms.txt catalog for guide MDX only — HTML + .md links, short API pointer.
 * Does not include OpenAPI schemas. Paths are site-relative.
 */
export function buildLlmsTxt(): string {
  const docs = getDocsCorpus();
  const lines: string[] = [
    "# Guestbook documentation",
    "",
    "> Composed guide docs for agents (discover → fetch → cite).",
    "> Interactive API reference is separate; OpenAPI schemas are not listed here.",
    "",
  ];

  const bySection = new Map<string, ComposedDoc[]>();
  for (const doc of docs) {
    const section = doc.section?.trim() || "Guides";
    const list = bySection.get(section) ?? [];
    list.push(doc);
    bySection.set(section, list);
  }

  for (const [section, sectionDocs] of bySection) {
    lines.push(`## ${section}`, "");
    for (const doc of sectionDocs) {
      const html = doc.href;
      const md = `${doc.href}.md`;
      const note = doc.subtitle?.trim();
      if (note) {
        lines.push(`- [${doc.title}](${html}) ([markdown](${md})): ${note}`);
      } else {
        lines.push(`- [${doc.title}](${html}) ([markdown](${md}))`);
      }
    }
    lines.push("");
  }

  lines.push(
    "## API",
    "",
    "- [API Library](/docs/api): Interactive OpenAPI explorer (Scalar). Use that page or a future OpenAPI export — schemas are not dumped into this catalog.",
    "",
  );

  return `${lines.join("\n").trimEnd()}\n`;
}
