import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { createProcessor } from "@mdx-js/mdx";
import GithubSlugger from "github-slugger";
import remarkGfm from "remark-gfm";
import { VFile } from "vfile";
import { flags } from "@/lib/flags";
import { DOCS_NAV_SECTIONS } from "@/app/docs/_nav/docs-nav-data";
import remarkDocsSyntax from "../mdx/remark-docs-syntax.mjs";
import type { ComposedDoc, ComposedSection, DocsSearchDoc } from "./searchTypes";

export type { ComposedDoc, ComposedSection, DocsSearchDoc } from "./searchTypes";

const DOCS_ROOT = path.join(process.cwd(), "src/app/docs");
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

type MdastNode = {
  type: string;
  depth?: number;
  value?: string;
  name?: string;
  children?: MdastNode[];
  data?: { estree?: { body?: unknown[] } };
};

type DocsProcessor = ReturnType<typeof createProcessor>;

function unquote(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseYamlValue(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function parseYamlBlock(block: string) {
  const data: Record<string, unknown> = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    if (!key) continue;
    data[key] = parseYamlValue(unquote(line.slice(sep + 1).trim()));
  }
  return data;
}

function splitFrontmatter(source: string) {
  const match = String(source).match(FRONTMATTER);
  if (!match) {
    return { data: {} as Record<string, unknown>, body: String(source) };
  }
  return {
    data: parseYamlBlock(match[1]),
    body: String(source).slice(match[0].length),
  };
}

function toPlainText(node: MdastNode): string {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value ?? "";
  }
  return (node.children ?? []).map(toPlainText).join("");
}

function headingSkippedFromNav(parent: MdastNode | null) {
  return (
    parent?.type === "mdxJsxFlowElement" &&
    (parent.name === "DocsTab" ||
      parent.name === "DocsTabset" ||
      parent.name === "DocsCallout")
  );
}

function collectMdxComponentImports(tree: MdastNode) {
  const imports = new Map<string, string>();

  for (const node of tree.children ?? []) {
    if (node.type !== "mdxjsEsm" || !node.data?.estree) continue;

    for (const stmt of node.data.estree.body ?? []) {
      const declaration = stmt as {
        type?: string;
        source?: { value?: string };
        specifiers?: { local?: { name?: string } }[];
      };
      if (declaration.type !== "ImportDeclaration") continue;
      const source = declaration.source?.value;
      if (typeof source !== "string" || !source.includes(".mdx")) continue;
      for (const spec of declaration.specifiers ?? []) {
        if (spec.local?.name) {
          imports.set(spec.local.name, source);
        }
      }
    }
  }

  return imports;
}

function normalizeHref(href: string) {
  if (href.length > 1 && href.endsWith("/")) {
    return href.slice(0, -1);
  }
  return href;
}

function sectionForHref(href: string) {
  const target = normalizeHref(href);
  for (const group of DOCS_NAV_SECTIONS) {
    for (const item of group.items ?? []) {
      if (item.href && normalizeHref(item.href) === target) {
        return group.title;
      }
    }
  }
  return undefined;
}

function walkContentFiles(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_snippets") continue;
      walkContentFiles(full, out);
      continue;
    }
    if (entry.name === "content.mdx") {
      out.push(full);
    }
  }
  return out;
}

function slugFromContentPath(filePath: string) {
  return path.relative(DOCS_ROOT, path.dirname(filePath)).replace(/\\/g, "/");
}

function createDocsProcessor() {
  return createProcessor({
    // remark-docs-syntax is a classic remark plugin factory (.mjs).
    remarkPlugins: [remarkGfm, remarkDocsSyntax as never],
  });
}

function parseDocsFileSync(processor: DocsProcessor, filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const file = new VFile({ path: filePath, value: raw });
  const tree = processor.parse(file) as MdastNode;
  processor.runSync(tree as never, file);
  const frontmatter =
    (file.data as { docsFrontmatter?: Record<string, unknown> }).docsFrontmatter ??
    splitFrontmatter(raw).data;
  return { tree, frontmatter };
}

function appendBody(parts: string[], text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned) {
    parts.push(cleaned);
  }
}

type WalkState = {
  filename: string;
  parseFile: (resolved: string) => MdastNode;
  imports: Map<string, string>;
  seen: Set<string>;
  title: string;
  sections: ComposedSection[];
  intro: string[];
  current: { id: string; heading: string; bodyParts: string[] } | null;
  slugger: GithubSlugger;
};

function flushCurrent(state: WalkState) {
  if (!state.current) return;
  if (state.current.id) {
    state.sections.push({
      id: state.current.id,
      heading: state.current.heading,
      body: state.current.bodyParts.join(" ").trim(),
    });
  } else {
    state.intro.push(...state.current.bodyParts);
  }
  state.current = null;
}

function collectSearchWalk(
  node: MdastNode,
  parent: MdastNode | null,
  state: WalkState,
) {
  if (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    typeof node.name === "string" &&
    state.imports.has(node.name)
  ) {
    if (!headingSkippedFromNav(parent)) {
      const resolved = path.resolve(
        path.dirname(state.filename),
        state.imports.get(node.name)!,
      );
      if (!state.seen.has(resolved)) {
        state.seen.add(resolved);
        const snippetTree = state.parseFile(resolved);
        const snippetImports = collectMdxComponentImports(snippetTree);
        const nested: WalkState = {
          ...state,
          filename: resolved,
          imports: snippetImports,
        };
        for (const child of snippetTree.children ?? []) {
          collectSearchWalk(child, snippetTree, nested);
        }
      }
    } else {
      const target = state.current?.bodyParts ?? state.intro;
      appendBody(target, toPlainText(node));
    }
    return;
  }

  if (node.type === "heading") {
    const label = toPlainText(node).trim();
    const id = state.slugger.slug(label);

    if (node.depth === 1 && !headingSkippedFromNav(parent) && !state.title) {
      state.title = label;
      flushCurrent(state);
      state.current = { id: "", heading: label, bodyParts: [] };
      return;
    }

    if (
      (node.depth === 2 || node.depth === 3) &&
      !headingSkippedFromNav(parent)
    ) {
      flushCurrent(state);
      state.current = { id, heading: label, bodyParts: [] };
      return;
    }

    const target = state.current?.bodyParts ?? state.intro;
    appendBody(target, label);
    return;
  }

  if (node.type === "mdxjsEsm") {
    return;
  }

  if (
    node.type === "paragraph" ||
    node.type === "code" ||
    node.type === "blockquote" ||
    node.type === "listItem" ||
    node.type === "tableCell"
  ) {
    const target = state.current?.bodyParts ?? state.intro;
    appendBody(target, toPlainText(node));
    return;
  }

  for (const child of node.children ?? []) {
    collectSearchWalk(child, node, state);
  }
}

function treeToComposedDoc(
  tree: MdastNode,
  meta: {
    slug: string;
    href: string;
    frontmatter: Record<string, unknown>;
    filename: string;
    parseFile: (resolved: string) => MdastNode;
  },
): ComposedDoc | null {
  const state: WalkState = {
    filename: meta.filename,
    parseFile: meta.parseFile,
    imports: collectMdxComponentImports(tree),
    seen: new Set([path.resolve(meta.filename)]),
    title: "",
    sections: [],
    intro: [],
    current: null,
    slugger: new GithubSlugger(),
  };

  for (const child of tree.children ?? []) {
    collectSearchWalk(child, tree, state);
  }
  flushCurrent(state);

  if (!state.title) {
    return null;
  }

  const introBody = state.intro.join(" ").trim();
  const markdownParts = [`# ${state.title}`, ""];
  if (introBody) {
    markdownParts.push(introBody, "");
  }
  for (const section of state.sections) {
    markdownParts.push(`## ${section.heading}`, "", section.body, "");
  }

  return {
    slug: meta.slug,
    href: meta.href,
    title: state.title,
    section: sectionForHref(meta.href),
    subtitle:
      typeof meta.frontmatter.subtitle === "string"
        ? meta.frontmatter.subtitle
        : undefined,
    markdown: `${markdownParts.join("\n").trim()}\n`,
    sections: [
      ...(introBody
        ? [{ id: "", heading: state.title, body: introBody }]
        : []),
      ...state.sections,
    ],
  };
}

export function flattenSearchDocs(docs: ComposedDoc[]): DocsSearchDoc[] {
  const out: DocsSearchDoc[] = [];
  const seen = new Set<string>();

  function push(doc: DocsSearchDoc) {
    if (seen.has(doc.id)) return;
    seen.add(doc.id);
    out.push(doc);
  }

  for (const doc of docs) {
    const pageBody = doc.sections
      .filter((section) => !section.id)
      .map((section) => section.body)
      .join(" ")
      .trim();

    push({
      id: doc.slug,
      href: doc.href,
      title: doc.title,
      heading: doc.title,
      section: doc.section,
      body: pageBody || doc.subtitle || "",
    });

    for (const section of doc.sections) {
      if (!section.id) continue;
      push({
        id: `${doc.slug}#${section.id}`,
        href: `${doc.href}#${section.id}`,
        title: doc.title,
        heading: section.heading,
        section: doc.section,
        body: section.body,
      });
    }
  }

  return out;
}

export function composeDocsCorpus(): ComposedDoc[] {
  if (!fs.existsSync(DOCS_ROOT)) {
    return [];
  }

  const processor = createDocsProcessor();
  const treeCache = new Map<string, MdastNode>();
  const docs: ComposedDoc[] = [];

  const parseFile = (resolvedPath: string) => {
    const resolved = path.resolve(resolvedPath);
    const cached = treeCache.get(resolved);
    if (cached) return cached;
    const { tree } = parseDocsFileSync(processor, resolved);
    treeCache.set(resolved, tree);
    return tree;
  };

  for (const filePath of walkContentFiles(DOCS_ROOT)) {
    const raw = fs.readFileSync(filePath, "utf8");
    const { data: earlyMatter } = splitFrontmatter(raw);

    if (earlyMatter.search === false) continue;
    if (flags.public && earlyMatter.public === false) continue;

    const { tree, frontmatter } = parseDocsFileSync(processor, filePath);
    treeCache.set(path.resolve(filePath), tree);

    if (frontmatter.search === false) continue;
    if (flags.public && frontmatter.public === false) continue;

    const slug = slugFromContentPath(filePath);
    if (!slug || slug.split("/").includes("_snippets")) continue;

    const composed = treeToComposedDoc(tree, {
      slug,
      href: `/docs/${slug}`,
      frontmatter,
      filename: filePath,
      parseFile,
    });
    if (composed) {
      docs.push(composed);
    }
  }

  docs.sort((a, b) => a.href.localeCompare(b.href));
  return docs;
}

export const getDocsSearchIndex = cache((): DocsSearchDoc[] => {
  return flattenSearchDocs(composeDocsCorpus());
});

/** Cached composed guide corpus (same filter as MiniSearch / llms.txt). */
export const getDocsCorpus = cache((): ComposedDoc[] => composeDocsCorpus());
