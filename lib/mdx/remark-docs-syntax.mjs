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
// Longer roman forms first so "viii." is not parsed as "i" + "ii.".
const ROMAN_ITEM =
  /^(xx|xix|xviii|xvii|xvi|xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\.[ \t]+(.*)$/is;
const ALPHA_ITEM = /^([a-z])\.[ \t]+(.*)$/s;
const ROMAN_TOKEN =
  /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)$/i;
// Line-start marker for a./b. or i./ii. list items (indent captured).
const STYLED_LIST_LINE =
  /^([ \t]*)(?:xx|xix|xviii|xvii|xvi|xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i|[a-z])\.[ \t]+/i;

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

function normalizeStyledListContinuationIndent(line, listIndent) {
  if (!line.trim()) {
    return { line, listIndent };
  }

  const styled = line.match(STYLED_LIST_LINE);
  if (styled) {
    return { line, listIndent: styled[1] };
  }

  if (listIndent == null) {
    return { line, listIndent };
  }

  const indent = leadingIndent(line);
  if (indent.length <= listIndent.length) {
    // Left the indented a./i. block (sibling content or outer list text).
    return { line, listIndent: null };
  }

  const rest = line.slice(indent.length);
  // Keep nested decimal/bullet lists and fences; only unwrap prose indents.
  if (
    /^\d+\.[ \t]/.test(rest) ||
    /^[-*+][ \t]/.test(rest) ||
    rest.startsWith("```") ||
    rest.startsWith("~~~") ||
    rest.startsWith(":::")
  ) {
    return { line, listIndent };
  }

  return { line: listIndent + rest, listIndent };
}

function rewriteDocsMarkdown(value) {
  const lines = String(value).split(/\r?\n/);
  const out = [];
  let inCode = false;
  let fenceChar = "";
  let fenceLen = 0;
  let styledListIndent = null;

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
        styledListIndent = null;
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

    const normalized = normalizeStyledListContinuationIndent(line, styledListIndent);
    styledListIndent = normalized.listIndent;
    const rewritten = rewriteFenceLine(rewriteOutsideInlineCode(normalized.line));
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

function phrasingLines(paragraph) {
  const lines = [[]];

  for (const child of paragraph.children ?? []) {
    if (
      child.type === "text" &&
      typeof child.value === "string" &&
      child.value.includes("\n")
    ) {
      const parts = child.value.split("\n");
      for (let index = 0; index < parts.length; index += 1) {
        if (index > 0) {
          lines.push([]);
        }
        if (parts[index]) {
          lines[lines.length - 1].push({ ...child, value: parts[index] });
        }
      }
      continue;
    }

    lines[lines.length - 1].push(child);
  }

  return lines.filter((line) => line.length > 0);
}

function matchStyledMarker(line) {
  const first = line[0];
  if (!first || first.type !== "text" || typeof first.value !== "string") {
    return null;
  }

  // Longer roman forms first so "ii." is not parsed as alpha "i" + leftover.
  const match = first.value.match(ROMAN_ITEM) || first.value.match(ALPHA_ITEM);
  if (!match) {
    return null;
  }

  const marker = match[1].toLowerCase();
  const rest = match[2];
  const isRoman = ROMAN_TOKEN.test(marker);
  const kind =
    isRoman && (marker.length > 1 || marker === "i" || marker === "v" || marker === "x")
      ? "roman"
      : "alpha";

  const content = [];
  if (rest) {
    content.push({ ...first, value: rest });
  }
  content.push(...line.slice(1));
  return { kind, marker, content };
}

function listTypeForItems(items) {
  const markers = items.map((item) => item.marker);
  const allRoman = markers.every((marker) => ROMAN_TOKEN.test(marker));
  const hasMultiRoman = markers.some((marker) => marker.length > 1);

  // ii./iii. (or multiple roman markers) → lower-roman; otherwise a./b. → lower-alpha.
  // A lone "i." is treated as alphabetic (9th letter), not roman 1.
  if (allRoman && (hasMultiRoman || markers.length > 1)) {
    return "i";
  }
  if (markers.every((marker) => /^[a-z]$/.test(marker))) {
    return "a";
  }
  return null;
}

function styledListClassName(type, loose = false) {
  const names = type === "a" ? ["docs-ol-alpha"] : ["docs-ol-roman"];
  if (loose) {
    names.push("docs-ol-loose");
  }
  return names;
}

function buildStyledList(items, type, loose = false) {
  const spread = loose || items.some((item) => item.children.length > 1);
  return {
    type: "list",
    ordered: true,
    start: 1,
    spread,
    children: items.map((item) => ({
      type: "listItem",
      spread: item.children.length > 1,
      checked: null,
      children: item.children,
    })),
    data: {
      hProperties: {
        type,
        className: styledListClassName(type, loose),
      },
    },
  };
}

function paragraphChildrenFromLines(lines) {
  const children = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (index > 0) {
      children.push({ type: "text", value: " " });
    }
    children.push(...lines[index]);
  }
  return children.length > 0 ? children : [{ type: "text", value: "" }];
}

function extractStyledItemsFromParagraph(paragraph) {
  const lines = phrasingLines(paragraph);
  if (lines.length === 0) {
    return null;
  }

  const items = [];
  for (const line of lines) {
    const matched = matchStyledMarker(line);
    if (matched) {
      items.push({
        marker: matched.marker,
        lineGroups: [
          matched.content.length > 0 ? matched.content : [{ type: "text", value: "" }],
        ],
      });
      continue;
    }
    // Soft-wrapped continuation under the current a./i. item.
    if (items.length === 0) {
      return null;
    }
    items[items.length - 1].lineGroups.push(line);
  }

  if (items.length === 0) {
    return null;
  }

  return items.map((item) => ({
    marker: item.marker,
    children: [
      {
        type: "paragraph",
        children: paragraphChildrenFromLines(item.lineGroups),
      },
    ],
  }));
}

function codeToContinuationParagraph(node) {
  const value = String(node.value ?? "").replace(/^\n+|\n+$/g, "");
  if (!value || node.lang) {
    return null;
  }
  // Indented "code" under a./b. items is usually prose continuation, not a fence.
  if (value.includes("\n") && /^( {4}|\t)/m.test(value)) {
    return null;
  }
  return {
    type: "paragraph",
    children: [{ type: "text", value }],
  };
}

function isContinuationNode(node) {
  if (node?.type === "paragraph") {
    return extractStyledItemsFromParagraph(node) == null;
  }
  if (node?.type === "code") {
    return codeToContinuationParagraph(node) != null;
  }
  return false;
}

function hasFutureStyledMarker(children, start) {
  for (let index = start; index < children.length; index += 1) {
    const node = children[index];
    if (node.type === "paragraph" && extractStyledItemsFromParagraph(node)) {
      return true;
    }
    if (isContinuationNode(node)) {
      continue;
    }
    return false;
  }
  return false;
}

function appendContinuation(item, node) {
  if (node.type === "paragraph") {
    item.children.push(node);
    return true;
  }
  if (node.type === "code") {
    const paragraph = codeToContinuationParagraph(node);
    if (!paragraph) {
      return false;
    }
    item.children.push(paragraph);
    return true;
  }
  return false;
}

function consumeStyledListRun(children, start) {
  const first = children[start];
  if (first?.type !== "paragraph") {
    return null;
  }

  const extracted = extractStyledItemsFromParagraph(first);
  if (!extracted) {
    return null;
  }

  const items = extracted.map((item) => ({
    marker: item.marker,
    children: [...item.children],
  }));
  let index = start + 1;

  while (index < children.length) {
    const node = children[index];

    if (node.type === "paragraph") {
      const more = extractStyledItemsFromParagraph(node);
      if (more) {
        for (const item of more) {
          items.push({
            marker: item.marker,
            children: [...item.children],
          });
        }
        index += 1;
        continue;
      }

      if (hasFutureStyledMarker(children, index + 1) && appendContinuation(items[items.length - 1], node)) {
        index += 1;
        continue;
      }
      break;
    }

    if (
      node.type === "code" &&
      hasFutureStyledMarker(children, index + 1) &&
      appendContinuation(items[items.length - 1], node)
    ) {
      index += 1;
      continue;
    }

    break;
  }

  const type = listTypeForItems(items);
  if (!type) {
    return null;
  }

  // Multiple sibling blocks (blank lines between a./b.) → loose list spacing.
  const loose =
    index - start > 1 || items.some((item) => item.children.length > 1);

  return {
    list: buildStyledList(
      items.map((item) => ({ children: item.children })),
      type,
      loose,
    ),
    count: index - start,
  };
}

function transformStyledOrderedLists(tree) {
  visit(tree, (node) => {
    if (
      node.type !== "listItem" &&
      node.type !== "root" &&
      node.type !== "blockquote"
    ) {
      return;
    }
    if (!node.children?.length) {
      return;
    }

    const next = [];
    let index = 0;
    while (index < node.children.length) {
      const consumed = consumeStyledListRun(node.children, index);
      if (consumed) {
        next.push(consumed.list);
        index += consumed.count;
      } else {
        next.push(node.children[index]);
        index += 1;
      }
    }
    node.children = next;
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
    transformStyledOrderedLists(tree);

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
