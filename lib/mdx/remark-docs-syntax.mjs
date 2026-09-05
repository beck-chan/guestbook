import { valueToEstree } from "estree-util-value-to-estree";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";

const BUTTON_MARK = "docs-button";
const BUTTON_ATTR = new RegExp(`^\\s*${BUTTON_MARK}`);
const OPEN_FENCE = /^:::docs-fence(?:\s|$)/;
const CLOSE_FENCE = /^::: *$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const FENCE_OPEN_LINE = /^::: *\{([^}]*)\} *(?:#.*)?$/;
const CODE_FENCE_LINE = /^(`{3,}|~{3,})(.*)$/;

function rewriteFenceLine(line) {
  const match = line.match(FENCE_OPEN_LINE);
  if (!match) {
    return line;
  }

  const classes = match[1]
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/^\./, ""))
    .filter(Boolean);

  return classes.length > 0 ? `:::docs-fence ${classes.join(" ")}` : line;
}

function isFenceControlLine(line) {
  return /^(:::docs-fence(?:\s|$)|::: *$)/.test(line);
}

function rewriteDocsMarkdown(value) {
  const withButtons = value.replace(
    /\]\(([^)]*)\)\{\s*\.button\s*\}/g,
    `]($1) ${BUTTON_MARK}`,
  );

  const lines = withButtons.split(/\r?\n/);
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

    const rewritten = rewriteFenceLine(line);
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

    data[key] = unquote(line.slice(sep + 1).trim());
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

function applyButtonClass(link) {
  const hProperties = {
    ...(link.data?.hProperties ?? {}),
    className: ["docs-cta"],
  };
  link.data = { ...link.data, hProperties };
}

function transformButtons(tree) {
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
        const match = following.value.match(BUTTON_ATTR);
        if (match) {
          applyButtonClass(current);
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
  if (node.type === "text") {
    return node.value ?? "";
  }
  return (node.children ?? []).map(toPlainText).join("");
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
      const tabs = splitTabs(inner);
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

function collectToc(tree) {
  const slugger = new GithubSlugger();
  const toc = [];

  visit(tree, "heading", (node, _index, parent) => {
    const label = toPlainText(node).trim();
    const id = slugger.slug(label);
    const inTab =
      parent?.type === "mdxJsxFlowElement" &&
      (parent.name === "DocsTab" || parent.name === "DocsTabset");

    if (!inTab && (node.depth === 2 || node.depth === 3)) {
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
    transformButtons(tree);
    transformFences(tree);

    const frontmatter = file?.data?.docsFrontmatter ?? {};
    injectSubtitle(tree, frontmatter.subtitle);

    if (!hasNamedExport(tree, "toc")) {
      tree.children.unshift(namedExportNode("toc", collectToc(tree)));
    }
    if (!hasNamedExport(tree, "frontmatter")) {
      tree.children.unshift(namedExportNode("frontmatter", frontmatter));
    }
  };
}
