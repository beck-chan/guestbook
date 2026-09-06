import { valueToEstree } from "estree-util-value-to-estree";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";

// Dots are percent-encoded so a trailing "." after `{.blank}` is not swallowed.
const ATTR_FOLLOW = /^\s*docsattr\.([A-Za-z0-9%_~!'()*+\-]+)/;
const LINK_ATTRS = /\]\(([^)]*)\)\{([^}]+)\}/g;
const INLINE_CODE = /(`+)((?:(?!\1).)*?)\1/g;
const ALLOWED_ATTRS = new Set(["target", "rel", "title"]);
const OPEN_FENCE = /^:::docs-fence(?:\s|$)/;
const CLOSE_FENCE = /^::: *$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const FENCE_OPEN_LINE = /^::: *\{([^}]*)\} *(?:#.*)?$/;
const FENCE_CLOSE_LINE = /^::: *$/;
const CODE_FENCE_LINE = /^(`{3,}|~{3,})(.*)$/;
const TASK_MARKER = /^\[([ xX])\](?:[ \t]+|$)/;

function encodeLinkAttrs(attrs) {
  return encodeURIComponent(attrs).replace(/\./g, "%2E");
}

function leadingIndent(line) {
  const match = line.match(/^[ \t]*/);
  return match ? match[0] : "";
}

function rewriteFenceLine(line) {
  // Allow indented fence markers (e.g. under list items). Rewrite `{.callout}`
  // away so MDX does not parse it as an expression, but keep the indent so the
  // fence stays nested in the list in the markdown AST.
  const indent = leadingIndent(line);
  const trimmed = line.slice(indent.length);
  const open = trimmed.match(FENCE_OPEN_LINE);
  if (open) {
    const classes = open[1]
      .trim()
      .split(/\s+/)
      .map((part) => part.replace(/^\./, ""))
      .filter(Boolean);

    return classes.length > 0
      ? `${indent}:::docs-fence ${classes.join(" ")}`
      : line;
  }

  if (FENCE_CLOSE_LINE.test(trimmed)) {
    return `${indent}:::`;
  }

  return line;
}

function isFenceControlLine(line) {
  return /^[ \t]*(:::docs-fence(?:\s|$)|::: *$)/.test(line);
}

function rewriteLinkAttrs(text) {
  return text.replace(
    LINK_ATTRS,
    (_, url, attrs) => `](${url}) docsattr.${encodeLinkAttrs(attrs.trim())}`,
  );
}

function rewriteOutsideInlineCode(line) {
  const chunks = [];
  let last = 0;
  let match;

  INLINE_CODE.lastIndex = 0;
  while ((match = INLINE_CODE.exec(line))) {
    if (match.index > last) {
      chunks.push(rewriteLinkAttrs(line.slice(last, match.index)));
    }
    chunks.push(match[0]);
    last = match.index + match[0].length;
  }

  if (last < line.length) {
    chunks.push(rewriteLinkAttrs(line.slice(last)));
  }

  return chunks.join("");
}

function rewriteDocsMarkdown(value) {
  const lines = String(value).split(/\r?\n/);
  const out = [];
  let inCode = false;
  let fenceChar = "";
  let fenceLen = 0;

  function push(line, isolate) {
    if (isolate && out.length > 0 && out[out.length - 1] !== "") {
      out.push("");
    }
    out.push(line);
    if (isolate) {
      out.push("");
    }
  }

  for (const line of lines) {
    const fence = line.match(CODE_FENCE_LINE);
    if (fence) {
      const mark = fence[1];
      const info = fence[2] ?? "";
      if (!inCode) {
        inCode = true;
        fenceChar = mark[0];
        fenceLen = mark.length;
        push(line, false);
        continue;
      }
      if (mark[0] === fenceChar && mark.length >= fenceLen && info.trim() === "") {
        inCode = false;
      }
      push(line, false);
      continue;
    }

    if (inCode) {
      push(line, false);
      continue;
    }

    const rewritten = rewriteFenceLine(rewriteOutsideInlineCode(line));
    push(rewritten, isFenceControlLine(rewritten));
  }

  return out.join("\n");
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseYamlValue(value) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

function parseYamlBlock(block) {
  const data = {};

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const sep = line.indexOf(":");
    if (sep === -1) {
      continue;
    }

    const key = line.slice(0, sep).trim();
    if (!key) {
      continue;
    }

    data[key] = parseYamlValue(unquote(line.slice(sep + 1).trim()));
  }

  return data;
}

function splitFrontmatter(source) {
  const match = String(source).match(FRONTMATTER);
  if (!match) {
    return { data: {}, body: String(source) };
  }

  return {
    data: parseYamlBlock(match[1]),
    body: String(source).slice(match[0].length),
  };
}

function parseAttrList(raw) {
  const className = [];
  const attrs = {};
  let id;
  const token =
    /([.#][\w:-]+)|([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s}"']+)))?/g;

  let match;
  while ((match = token.exec(raw))) {
    if (match[1]) {
      if (match[1].startsWith("#")) {
        id = match[1].slice(1);
      } else {
        const cls = match[1].slice(1);
        if (cls === "button") {
          className.push("docs-cta");
        } else if (cls === "blank") {
          attrs.target = "_blank";
        } else {
          className.push(cls);
        }
      }
      continue;
    }

    const name = match[2];
    if (!name) {
      continue;
    }

    const value = match[3] ?? match[4] ?? match[5] ?? "true";
    if (name === "class" || name === "className") {
      className.push(...value.split(/\s+/).filter(Boolean));
    } else if (name === "id") {
      id = value;
    } else if (ALLOWED_ATTRS.has(name)) {
      attrs[name] = value;
    }
  }

  return { id, className, attrs };
}

function applyLinkAttrs(link, raw) {
  const parsed = parseAttrList(raw);
  const current = link.data?.hProperties ?? {};
  const existingClass = current.className;
  const prevClass = Array.isArray(existingClass)
    ? existingClass
    : existingClass
      ? [existingClass]
      : [];
  const hProperties = { ...current, ...parsed.attrs };

  if (parsed.id) {
    hProperties.id = parsed.id;
  }
  if (prevClass.length > 0 || parsed.className.length > 0) {
    hProperties.className = [...prevClass, ...parsed.className];
  }
  if (hProperties.target === "_blank" && !hProperties.rel) {
    hProperties.rel = "noopener noreferrer";
  }

  link.data = { ...link.data, hProperties };
}

function transformTaskLists(tree) {
  visit(tree, "listItem", (node) => {
    if (typeof node.checked === "boolean") {
      return;
    }

    const paragraph = node.children?.[0];
    if (paragraph?.type !== "paragraph") {
      return;
    }

    const first = paragraph.children?.[0];
    if (first?.type !== "text" || typeof first.value !== "string") {
      return;
    }

    const match = first.value.match(TASK_MARKER);
    if (!match) {
      return;
    }

    node.checked = match[1] !== " ";
    first.value = first.value.slice(match[0].length);
    if (!first.value) {
      paragraph.children.shift();
    }
  });
}

function transformLinkAttrs(tree) {
  visit(tree, (node) => {
    const children = node.children;
    if (!children) {
      return;
    }

    const next = [];

    for (let index = 0; index < children.length; index += 1) {
      const current = children[index];
      const following = children[index + 1];

      if (
        current.type === "link" &&
        following?.type === "text" &&
        typeof following.value === "string"
      ) {
        const match = following.value.match(ATTR_FOLLOW);
        if (match) {
          applyLinkAttrs(current, decodeURIComponent(match[1]));
          const remainder = following.value.slice(match[0].length);
          next.push(current);
          if (remainder) {
            next.push({ ...following, value: remainder });
          }
          index += 1;
          continue;
        }
      }

      next.push(current);
    }

    node.children = next;
  });
}

function toPlainText(node) {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value ?? "";
  }
  return (node.children ?? []).map(toPlainText).join("");
}

function headingSkippedFromNav(parent) {
  return (
    parent?.type === "mdxJsxFlowElement" &&
    (parent.name === "DocsTab" ||
      parent.name === "DocsTabset" ||
      parent.name === "DocsCallout")
  );
}

function demoteCalloutTitles(tree) {
  visit(tree, "heading", (node, _index, parent) => {
    if (
      node.depth === 1 &&
      parent?.type === "mdxJsxFlowElement" &&
      parent.name === "DocsCallout"
    ) {
      node.depth = 3;
    }
  });
}

function isFence(node, pattern) {
  if (node.type !== "paragraph") {
    return false;
  }
  return pattern.test(toPlainText(node).trim());
}

function splitTabs(nodes) {
  const tabs = [];
  let current;

  for (const node of nodes) {
    if (node.type === "heading" && (node.depth === 1 || node.depth === 2)) {
      if (current) {
        tabs.push(current);
      }
      current = { label: toPlainText(node).trim() || "Tab", children: [] };
      continue;
    }
    if (current) {
      current.children.push(node);
    }
  }

  if (current) {
    tabs.push(current);
  }

  return tabs;
}

function toTabset(tabs) {
  return {
    type: "mdxJsxFlowElement",
    name: "DocsTabset",
    attributes: [],
    children: tabs.map((tab) => ({
      type: "mdxJsxFlowElement",
      name: "DocsTab",
      attributes: [
        {
          type: "mdxJsxAttribute",
          name: "label",
          value: tab.label,
        },
      ],
      children: tab.children,
    })),
  };
}

function findFenceClose(children, start) {
  let depth = 1;

  for (let index = start + 1; index < children.length; index += 1) {
    if (isFence(children[index], OPEN_FENCE)) {
      depth += 1;
    } else if (isFence(children[index], CLOSE_FENCE)) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function parseFence(node) {
  if (node.type !== "paragraph") {
    return null;
  }

  const text = toPlainText(node).trim();
  const match = text.match(/^:::docs-fence(?:\s+(.*))?$/);
  if (!match) {
    return null;
  }

  return (match[1] ?? "").trim().split(/\s+/).filter(Boolean);
}

function fenceKind(classes) {
  if (classes.includes("tabset")) {
    return "tabset";
  }
  if (classes.includes("callout")) {
    return "callout";
  }
  if (classes.includes("columns")) {
    return "columns";
  }
  if (classes.some((cls) => /^\d+$/.test(cls))) {
    return "column";
  }
  return null;
}

function mdxAttr(name, value) {
  return {
    type: "mdxJsxAttribute",
    name,
    value,
  };
}

function toCallout(children) {
  return {
    type: "mdxJsxFlowElement",
    name: "DocsCallout",
    attributes: [],
    children,
  };
}

function toColumns(classes, children) {
  const space = classes.filter((cls) => cls !== "columns").join(" ");
  return {
    type: "mdxJsxFlowElement",
    name: "DocsColumns",
    attributes: space ? [mdxAttr("space", space)] : [],
    children,
  };
}

function toColumn(classes, children) {
  const width = classes.find((cls) => /^\d+$/.test(cls)) ?? "100";
  return {
    type: "mdxJsxFlowElement",
    name: "DocsColumn",
    attributes: [mdxAttr("width", width)],
    children,
  };
}

function transformFences(parent) {
  const children = parent.children;
  if (!children) {
    return;
  }

  for (const child of children) {
    transformFences(child);
  }

  let index = 0;
  while (index < children.length) {
    const classes = parseFence(children[index]);
    const kind = classes ? fenceKind(classes) : null;

    if (!kind) {
      index += 1;
      continue;
    }

    const close = findFenceClose(children, index);
    if (close === -1) {
      break;
    }

    const inner = children.slice(index + 1, close);
    let replacement;

    if (kind === "tabset") {
      const nested = { type: "root", children: inner };
      transformFences(nested);
      const tabs = splitTabs(nested.children);
      if (tabs.length === 0) {
        children.splice(index, close - index + 1);
        continue;
      }
      replacement = toTabset(tabs);
    } else if (kind === "callout") {
      replacement = toCallout(inner);
    } else if (kind === "columns") {
      replacement = toColumns(classes, inner);
    } else {
      replacement = toColumn(classes, inner);
    }

    children.splice(index, close - index + 1, replacement);
    transformFences(replacement);
    index += 1;
  }
}

function hasNamedExport(tree, name) {
  const pattern = new RegExp(`\\bexport\\s+const\\s+${name}\\b`);
  return (tree.children ?? []).some(
    (node) => node.type === "mdxjsEsm" && pattern.test(node.value ?? ""),
  );
}

function collectTitle(tree) {
  let title = "";

  visit(tree, "heading", (node, _index, parent) => {
    if (title || node.depth !== 1 || headingSkippedFromNav(parent)) {
      return;
    }
    title = toPlainText(node).trim();
  });

  return title;
}

function collectToc(tree) {
  const slugger = new GithubSlugger();
  const toc = [];

  visit(tree, "heading", (node, _index, parent) => {
    const label = toPlainText(node).trim();
    const id = slugger.slug(label);

    if (
      !headingSkippedFromNav(parent) &&
      (node.depth === 2 || node.depth === 3)
    ) {
      toc.push({ href: `#${id}`, label, depth: node.depth });
    }
  });

  return toc;
}

function namedExportNode(name, value) {
  return {
    type: "mdxjsEsm",
    value: "",
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ExportNamedDeclaration",
            specifiers: [],
            source: null,
            declaration: {
              type: "VariableDeclaration",
              kind: "const",
              declarations: [
                {
                  type: "VariableDeclarator",
                  id: { type: "Identifier", name },
                  init: valueToEstree(value),
                },
              ],
            },
          },
        ],
      },
    },
  };
}

function injectSubtitle(tree, subtitle) {
  if (!subtitle) {
    return;
  }

  const children = tree.children;
  if (!children) {
    return;
  }

  const index = children.findIndex(
    (node) => node.type === "heading" && node.depth === 1,
  );
  if (index === -1) {
    return;
  }

  children.splice(index + 1, 0, {
    type: "mdxJsxFlowElement",
    name: "p",
    attributes: [
      {
        type: "mdxJsxAttribute",
        name: "className",
        value: "docs-subtitle",
      },
    ],
    children: [{ type: "text", value: subtitle }],
  });
}

export default function remarkDocsSyntax() {
  const original = this.parser;

  this.parser = (doc, file) => {
    const { data, body } = splitFrontmatter(String(doc));
    if (file) {
      file.data.docsFrontmatter = data;
    }
    const rewritten = rewriteDocsMarkdown(body);
    if (file) {
      file.value = rewritten;
    }
    return original.call(this, rewritten, file);
  };

  return (tree, file) => {
    transformLinkAttrs(tree);
    transformFences(tree);
    demoteCalloutTitles(tree);
    transformTaskLists(tree);

    const frontmatter = file?.data?.docsFrontmatter ?? {};
    injectSubtitle(tree, frontmatter.subtitle);

    if (!hasNamedExport(tree, "toc")) {
      tree.children.unshift(namedExportNode("toc", collectToc(tree)));
    }
    if (!hasNamedExport(tree, "title")) {
      tree.children.unshift(namedExportNode("title", collectTitle(tree)));
    }
    if (!hasNamedExport(tree, "frontmatter")) {
      tree.children.unshift(namedExportNode("frontmatter", frontmatter));
    }
  };
}
