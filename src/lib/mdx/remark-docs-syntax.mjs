import fs from "node:fs";
import path from "node:path";
import { valueToEstree } from "estree-util-value-to-estree";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";

// Dots are percent-encoded so a trailing "." after `{.blank}` is not swallowed.
const ATTR_FOLLOW = /^\s*docsattr\.([A-Za-z0-9%_~!'()*+\-]+)/;
const HEART_MARK = /docsheart\./g;
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
  return text.replace(LINK_ATTRS, (_, url, attrs) => {
    const trimmed = String(url).trim();
    // CommonMark link destinations cannot contain raw spaces unless <angled>.
    const dest =
      /\s/.test(trimmed) && !trimmed.startsWith("<")
        ? `<${trimmed}>`
        : trimmed;
    return `](${dest}) docsattr.${encodeLinkAttrs(attrs.trim())}`;
  });
}

function rewriteSpacedLinkDestinations(text) {
  // Same angle-bracket fix for links that do not carry `{.blank}` / `{.button}`.
  return text.replace(/\]\(([^)\n]+)\)/g, (full, url) => {
    const trimmed = String(url).trim();
    if (!/\s/.test(trimmed) || trimmed.startsWith("<")) {
      return full;
    }
    return `](<${trimmed}>)`;
  });
}

function rewriteInlineMarkup(text) {
  return rewriteSpacedLinkDestinations(rewriteLinkAttrs(text));
}

function rewriteHeartMarks(text) {
  // Strip every `{.heart}` before MDX parse — curly braces are JSX expressions.
  // Code/inlineCode get `{.heart}` restored after parse; prose becomes DocsHeart.
  return text.replace(/\{\.heart\}/g, "docsheart.");
}

function restoreHeartSyntax(text) {
  return text.replace(/docsheart\./g, "{.heart}");
}

function rewriteOutsideInlineCode(line) {
  const chunks = [];
  let last = 0;
  let match;

  INLINE_CODE.lastIndex = 0;
  while ((match = INLINE_CODE.exec(line))) {
    if (match.index > last) {
      chunks.push(rewriteInlineMarkup(line.slice(last, match.index)));
    }
    chunks.push(match[0]);
    last = match.index + match[0].length;
  }

  if (last < line.length) {
    chunks.push(rewriteInlineMarkup(line.slice(last)));
  }

  return chunks.join("");
}

function toInlineHeart() {
  return {
    type: "mdxJsxTextElement",
    name: "DocsHeart",
    attributes: [
      { type: "mdxJsxAttribute", name: "filled" },
      {
        type: "mdxJsxAttribute",
        name: "className",
        value: "docs-inline-heart",
      },
    ],
    children: [],
  };
}

function splitTextWithHearts(value) {
  if (!value.includes("docsheart.")) {
    return null;
  }

  const parts = [];
  let last = 0;
  HEART_MARK.lastIndex = 0;
  let match;
  while ((match = HEART_MARK.exec(value))) {
    if (match.index > last) {
      parts.push({ type: "text", value: value.slice(last, match.index) });
    }
    parts.push(toInlineHeart());
    last = match.index + match[0].length;
  }
  if (last < value.length) {
    parts.push({ type: "text", value: value.slice(last) });
  }
  return parts;
}

function transformHeartMarks(tree) {
  visit(tree, (node) => {
    if (
      (node.type === "inlineCode" || node.type === "code") &&
      typeof node.value === "string" &&
      node.value.includes("docsheart.")
    ) {
      node.value = restoreHeartSyntax(node.value);
      return;
    }

    const children = node.children;
    if (!children?.length) {
      return;
    }

    const next = [];
    let changed = false;

    for (const child of children) {
      if (child.type !== "text" || typeof child.value !== "string") {
        next.push(child);
        continue;
      }

      const parts = splitTextWithHearts(child.value);
      if (!parts) {
        next.push(child);
        continue;
      }

      changed = true;
      next.push(...parts);
    }

    if (changed) {
      node.children = next;
    }
  });
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

  return rewriteHeartMarks(out.join("\n"));
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

function shouldExtendStyledRun(items, more) {
  if (!items.length || !more?.length) {
    return false;
  }

  const type = listTypeForItems([...items, ...more]);
  if (!type) {
    return false;
  }

  const last = items[items.length - 1].marker;
  const firstNew = more[0].marker;

  // After a./b./c., a following "i." is roman 1 — not letter 9.
  if (type === "a") {
    const lastCode = last.charCodeAt(0);
    const nextCode = firstNew.charCodeAt(0);
    return (
      /^[a-z]$/.test(last) &&
      /^[a-z]$/.test(firstNew) &&
      (nextCode === lastCode + 1 || nextCode === lastCode)
    );
  }

  return ROMAN_TOKEN.test(last);
}

function extractStyledItemsFromCode(node) {
  if (node?.type !== "code" || node.lang) {
    return null;
  }

  const value = String(node.value ?? "").replace(/^\n+|\n+$/g, "");
  if (!value) {
    return null;
  }

  return extractStyledItemsFromParagraph({
    type: "paragraph",
    children: [{ type: "text", value }],
  });
}

function isAttachableContinuation(node) {
  return (
    node?.type === "list" ||
    node?.type === "code" ||
    node?.type === "blockquote" ||
    node?.type === "mdxJsxFlowElement"
  );
}

function isEmptyParagraph(node) {
  return node?.type === "paragraph" && !toPlainText(node).trim();
}

function itemEndsWithColon(item) {
  const last = item?.children?.[item.children.length - 1];
  if (last?.type !== "paragraph") {
    return false;
  }
  return toPlainText(last).trimEnd().endsWith(":");
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

function isSkippableBetweenStyledItems(node) {
  return (
    isEmptyParagraph(node) ||
    isContinuationNode(node) ||
    isAttachableContinuation(node)
  );
}

function hasFutureStyledMarker(children, start) {
  for (let index = start; index < children.length; index += 1) {
    const node = children[index];
    if (node.type === "paragraph" && extractStyledItemsFromParagraph(node)) {
      return true;
    }
    if (node.type === "code" && extractStyledItemsFromCode(node)) {
      return true;
    }
    if (isSkippableBetweenStyledItems(node)) {
      continue;
    }
    return false;
  }
  return false;
}

function nextNonEmptyNode(children, index) {
  for (let next = index + 1; next < children.length; next += 1) {
    if (!isEmptyParagraph(children[next])) {
      return children[next];
    }
  }
  return null;
}

function shouldAttachTrailingParagraph(node, children, index) {
  if (extractStyledItemsFromParagraph(node) != null) {
    return false;
  }
  if (toPlainText(node).trimEnd().endsWith(":")) {
    return true;
  }
  const next = nextNonEmptyNode(children, index);
  return next?.type === "code" || isAttachableContinuation(next);
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

function nestStyledItems(parent, more, loose = false) {
  const type = listTypeForItems(more);
  if (!type) {
    return false;
  }

  parent.children.push(
    buildStyledList(
      more.map((item) => ({ children: item.children })),
      type,
      loose,
    ),
  );
  return true;
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
        if (shouldExtendStyledRun(items, more)) {
          for (const item of more) {
            items.push({
              marker: item.marker,
              children: [...item.children],
            });
          }
          index += 1;
          continue;
        }

        const nested = consumeStyledListRun(children, index);
        const outerType = listTypeForItems(items);
        const innerType = nested?.list?.data?.hProperties?.type;
        if (nested && outerType && innerType && outerType !== innerType) {
          items[items.length - 1].children.push(nested.list);
          index += nested.count;
          continue;
        }
        break;
      }

      if (hasFutureStyledMarker(children, index + 1) && appendContinuation(items[items.length - 1], node)) {
        index += 1;
        continue;
      }
      break;
    }

    if (node.type === "code") {
      const fromCode = extractStyledItemsFromCode(node);
      if (fromCode) {
        if (shouldExtendStyledRun(items, fromCode)) {
          for (const item of fromCode) {
            items.push({
              marker: item.marker,
              children: [...item.children],
            });
          }
          index += 1;
          continue;
        }
        if (nestStyledItems(items[items.length - 1], fromCode, true)) {
          index += 1;
          continue;
        }
      }

      if (hasFutureStyledMarker(children, index + 1)) {
        if (appendContinuation(items[items.length - 1], node)) {
          index += 1;
          continue;
        }
        items[items.length - 1].children.push(node);
        index += 1;
        continue;
      }
      break;
    }

    if (
      isAttachableContinuation(node) &&
      hasFutureStyledMarker(children, index + 1)
    ) {
      items[items.length - 1].children.push(node);
      index += 1;
      continue;
    }

    break;
  }

  // Last a./i. item: hang-on prose and the fence after it still belong to
  // that item when there is no later marker (otherwise they lose indent).
  while (index < children.length && items.length > 0) {
    const node = children[index];
    if (isEmptyParagraph(node)) {
      index += 1;
      continue;
    }
    if (
      node.type === "paragraph" &&
      shouldAttachTrailingParagraph(node, children, index)
    ) {
      items[items.length - 1].children.push(node);
      index += 1;
      continue;
    }
    if (node.type === "code") {
      if (appendContinuation(items[items.length - 1], node)) {
        index += 1;
        continue;
      }
      if (itemEndsWithColon(items[items.length - 1])) {
        items[items.length - 1].children.push(node);
        index += 1;
        continue;
      }
    }
    if (
      isAttachableContinuation(node) &&
      itemEndsWithColon(items[items.length - 1])
    ) {
      items[items.length - 1].children.push(node);
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
      node.type !== "blockquote" &&
      node.type !== "mdxJsxFlowElement"
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

const EMBED_EXTENSIONS = [
  ".mdx",
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".jsx",
  ".sql",
  ".feature",
];

const EMBED_CODE_LANG = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  jsx: "jsx",
  sql: "sql",
  feature: "gherkin",
};

const FENCE_TOKEN =
  /(?:([\w-]+)=(?:"([^"]*)"|'([^']*)'|(\S+)))|(\S+)/g;

function isPublicDocs() {
  const value = process.env.FLAG_PUBLIC;
  if (value === undefined || value === "") {
    return false;
  }
  return value === "true" || value === "1";
}

function docsRoot() {
  return path.resolve(process.cwd(), "src/app/docs");
}

function assertUnderDocs(resolved) {
  const rel = path.relative(docsRoot(), resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Docs embed must stay under src/app/docs: ${resolved}`);
  }
}

function toEmbedSpecifier(src, isPublic) {
  const normalized = src.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.split("/").includes("..")) {
    throw new Error(`Docs embed src must stay next to the host file: ${src}`);
  }

  let ext = ".mdx";
  let base = normalized;
  const lower = normalized.toLowerCase();
  for (const known of EMBED_EXTENSIONS) {
    if (lower.endsWith(known)) {
      ext = known;
      base = normalized.slice(0, -known.length);
      break;
    }
  }

  return `./${base}${isPublic ? "-public" : ""}${ext}`;
}

function toEmbedImport(name, specifier) {
  return {
    type: "mdxjsEsm",
    value: `import ${name} from ${JSON.stringify(specifier)};`,
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ImportDeclaration",
            specifiers: [
              {
                type: "ImportDefaultSpecifier",
                local: { type: "Identifier", name },
              },
            ],
            source: { type: "Literal", value: specifier },
          },
        ],
      },
    },
  };
}

function toEmbedElement(name) {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes: [],
    children: [],
  };
}

function nextEmbedName(context) {
  context.embedCount = (context.embedCount ?? 0) + 1;
  return `DocsEmbed${context.embedCount}`;
}

function loadCodeEmbed(filename, specifier) {
  if (!filename) {
    throw new Error(`Docs embed "${specifier}" needs a host file path`);
  }

  const resolved = path.resolve(path.dirname(filename), specifier);
  assertUnderDocs(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const value = fs.readFileSync(resolved, "utf8").replace(/\n$/, "");
  const lang = EMBED_CODE_LANG[ext.slice(1)] ?? ext.slice(1);
  return [{ type: "code", lang, value }];
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

  const classes = [];
  const attrs = {};
  const rest = (match[1] ?? "").trim();
  FENCE_TOKEN.lastIndex = 0;
  let token;
  while ((token = FENCE_TOKEN.exec(rest))) {
    if (token[1]) {
      attrs[token[1]] = token[2] ?? token[3] ?? token[4];
    } else if (token[5]) {
      classes.push(token[5]);
    }
  }

  return { classes, attrs };
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
  if (classes.includes("public")) {
    return "public";
  }
  if (classes.includes("private")) {
    return "private";
  }
  if (classes.includes("embed")) {
    return "embed";
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

function transformFences(parent, context = {}) {
  const children = parent.children;
  if (!children) {
    return;
  }

  for (const child of children) {
    transformFences(child, context);
  }

  let index = 0;
  while (index < children.length) {
    const parsed = parseFence(children[index]);
    const kind = parsed ? fenceKind(parsed.classes) : null;

    if (!kind) {
      index += 1;
      continue;
    }

    const close = findFenceClose(children, index);
    if (close === -1) {
      break;
    }

    const inner = children.slice(index + 1, close);

    if (kind === "public" || kind === "private") {
      const keep = (kind === "public") === isPublicDocs();
      if (!keep) {
        children.splice(index, close - index + 1);
        continue;
      }
      children.splice(index, close - index + 1, ...inner);
      continue;
    }

    if (kind === "embed") {
      const src = parsed.attrs.src;
      if (!src) {
        throw new Error('Docs embed fence needs src="filename" (no extension)');
      }
      const specifier = toEmbedSpecifier(src, isPublicDocs());
      const ext = path.extname(specifier).toLowerCase();
      if (ext === ".mdx" || ext === ".md") {
        const name = nextEmbedName(context);
        context.embedImports ??= [];
        context.embedImports.push(toEmbedImport(name, specifier));
        children.splice(index, close - index + 1, toEmbedElement(name));
        index += 1;
        continue;
      }
      const loaded = loadCodeEmbed(context.filename, specifier);
      children.splice(index, close - index + 1, ...loaded);
      index += loaded.length;
      continue;
    }

    let replacement;

    if (kind === "tabset") {
      const nested = { type: "root", children: inner };
      transformFences(nested, context);
      const tabs = splitTabs(nested.children);
      if (tabs.length === 0) {
        children.splice(index, close - index + 1);
        continue;
      }
      replacement = toTabset(tabs);
    } else if (kind === "callout") {
      replacement = toCallout(inner);
    } else if (kind === "columns") {
      replacement = toColumns(parsed.classes, inner);
    } else {
      replacement = toColumn(parsed.classes, inner);
    }

    children.splice(index, close - index + 1, replacement);
    transformFences(replacement, context);
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

function collectMdxComponentImports(tree) {
  const imports = new Map();

  for (const node of tree.children ?? []) {
    if (node.type !== "mdxjsEsm" || !node.data?.estree) {
      continue;
    }

    for (const stmt of node.data.estree.body ?? []) {
      if (stmt.type !== "ImportDeclaration") {
        continue;
      }
      const source = stmt.source?.value;
      if (typeof source !== "string" || !source.includes(".mdx")) {
        continue;
      }
      for (const spec of stmt.specifiers ?? []) {
        if (spec.local?.name) {
          imports.set(spec.local.name, source);
        }
      }
    }
  }

  return imports;
}

function collectToc(tree, options = {}) {
  const { filename, parseFile, seen = new Set() } = options;
  const imports =
    filename && parseFile ? collectMdxComponentImports(tree) : new Map();
  const slugger = new GithubSlugger();
  const toc = [];

  function walk(node, parent) {
    if (node.type === "heading") {
      const label = toPlainText(node).trim();
      const id = slugger.slug(label);

      if (
        !headingSkippedFromNav(parent) &&
        (node.depth === 2 || node.depth === 3)
      ) {
        toc.push({ href: `#${id}`, label, depth: node.depth });
      }
    } else if (
      (node.type === "mdxJsxFlowElement" ||
        node.type === "mdxJsxTextElement") &&
      typeof node.name === "string" &&
      imports.has(node.name)
    ) {
      // Match host-heading rules: skip snippets nested in callouts/tabs.
      if (!headingSkippedFromNav(parent)) {
        const resolved = path.resolve(
          path.dirname(filename),
          imports.get(node.name),
        );
        if (!seen.has(resolved)) {
          seen.add(resolved);
          const snippetTree = parseFile(resolved);
          toc.push(
            ...collectToc(snippetTree, {
              filename: resolved,
              parseFile,
              seen,
            }),
          );
        }
      }
      return;
    }

    for (const child of node.children ?? []) {
      walk(child, node);
    }
  }

  walk(tree, null);
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

function applyDocsTransforms(tree, context = {}) {
  const next = {
    ...context,
    root: context.root ?? tree,
    embedImports: context.embedImports ?? [],
    embedCount: context.embedCount ?? 0,
  };
  transformLinkAttrs(tree);
  transformHeartMarks(tree);
  transformFences(tree, next);
  if (next.root === tree && next.embedImports.length > 0) {
    tree.children.unshift(...next.embedImports);
  }
  demoteCalloutTitles(tree);
  transformTaskLists(tree);
  transformStyledOrderedLists(tree);
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

  const parse = this.parser.bind(this);

  const parseFile = (resolvedPath, seen = new Set()) => {
    const resolved = path.resolve(resolvedPath);
    if (seen.has(resolved)) {
      throw new Error(`Circular docs embed: ${resolved}`);
    }

    const raw = fs.readFileSync(resolved, "utf8");
    const snippetFile = {
      path: resolved,
      history: [resolved],
      data: {},
      value: raw,
    };
    const snippetTree = parse(raw, snippetFile);
    const nextSeen = new Set(seen);
    nextSeen.add(resolved);
    applyDocsTransforms(snippetTree, {
      filename: resolved,
      parseFile,
      seen: nextSeen,
    });
    return snippetTree;
  };

  return (tree, file) => {
    const filename = file?.path || file?.history?.[0];
    const resolvedHost = filename ? path.resolve(filename) : null;
    applyDocsTransforms(tree, {
      filename: resolvedHost,
      parseFile,
      seen: resolvedHost ? new Set([resolvedHost]) : new Set(),
    });

    const frontmatter = file?.data?.docsFrontmatter ?? {};
    injectSubtitle(tree, frontmatter.subtitle);

    if (!hasNamedExport(tree, "toc")) {
      tree.children.unshift(
        namedExportNode(
          "toc",
          collectToc(tree, filename ? { filename, parseFile } : {}),
        ),
      );
    }
    if (!hasNamedExport(tree, "title")) {
      tree.children.unshift(namedExportNode("title", collectTitle(tree)));
    }
    if (!hasNamedExport(tree, "frontmatter")) {
      tree.children.unshift(namedExportNode("frontmatter", frontmatter));
    }
  };
}
