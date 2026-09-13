import fs from "node:fs";
import rehypeMermaid from "rehype-mermaid";
import { visit } from "unist-util-visit";

const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
if (browsersPath && !fs.existsSync(browsersPath)) {
  delete process.env.PLAYWRIGHT_BROWSERS_PATH;
}

function isParsableStyle(style) {
  if (typeof style !== "string") {
    return false;
  }
  const trimmed = style.trim();
  if (!trimmed || trimmed.includes("undefined")) {
    return false;
  }
  return trimmed.split(";").every((part) => {
    const declaration = part.trim();
    return !declaration || declaration.includes(":");
  });
}

function sanitizeSvgStyles(tree) {
  visit(tree, "element", (node) => {
    if (!node.properties || !("style" in node.properties)) {
      return;
    }
    if (!isParsableStyle(node.properties.style)) {
      delete node.properties.style;
    }
  });
}

function pinMermaidSvgSize(node) {
  const viewBox = String(node.properties?.viewBox ?? "");
  const parts = viewBox.trim().split(/[\s,]+/);
  const viewBoxWidth = parts.length === 4 ? Number(parts[2]) : Number.NaN;
  const style = typeof node.properties?.style === "string" ? node.properties.style : "";
  const maxWidth = Number(/max-width:\s*([\d.]+)px/i.exec(style)?.[1]);
  const width = Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : viewBoxWidth;
  if (Number.isFinite(width) && width > 0) {
    node.properties.width = String(width);
  }
}

function wrapMermaidSvgs(tree) {
  const replacements = [];

  visit(tree, "element", (node, index, parent) => {
    if (node.tagName !== "svg" || parent == null || typeof index !== "number") {
      return;
    }
    const id = node.properties?.id;
    if (typeof id !== "string" || !id.startsWith("mermaid")) {
      return;
    }
    const parentClasses = parent.properties?.className;
    const classes = Array.isArray(parentClasses)
      ? parentClasses
      : typeof parentClasses === "string"
        ? parentClasses.split(/\s+/)
        : [];
    if (parent.tagName === "div" && classes.includes("docs-mermaid")) {
      return;
    }
    pinMermaidSvgSize(node);
    replacements.push({ parent, index, node });
  });

  for (const { parent, index, node } of replacements) {
    parent.children[index] = {
      type: "element",
      tagName: "div",
      properties: { className: ["docs-mermaid"] },
      children: [node],
    };
  }
}

export default function rehypeDocsMermaid() {
  const render = rehypeMermaid({
    strategy: "inline-svg",
    mermaidConfig: {
      theme: "neutral",
      startOnLoad: false,
      fontFamily: "Arial, Helvetica, sans-serif",
      er: {
        useMaxWidth: false,
      },
    },
  });

  return async function rehypeDocsMermaidTransform(tree, file) {
    await render(tree, file);
    sanitizeSvgStyles(tree);
    wrapMermaidSvgs(tree);
  };
}
