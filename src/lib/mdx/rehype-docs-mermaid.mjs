import { valueToEstree } from "estree-util-value-to-estree";
import { visit } from "unist-util-visit";

function classNames(node) {
  const className = node.properties?.className;
  if (Array.isArray(className)) {
    return className.map(String);
  }
  if (typeof className === "string") {
    return className.split(/\s+/);
  }
  return [];
}

function mermaidSource(node) {
  const parts = [];
  visit(node, "text", (text) => {
    parts.push(text.value);
  });
  return parts.join("");
}

function chartAttr(chart) {
  return {
    type: "mdxJsxAttribute",
    name: "chart",
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: JSON.stringify(chart),
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          comments: [],
          body: [
            {
              type: "ExpressionStatement",
              expression: valueToEstree(chart),
            },
          ],
        },
      },
    },
  };
}

export default function rehypeDocsMermaid() {
  return function rehypeDocsMermaidTransform(tree) {
    const replacements = [];

    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || parent == null || typeof index !== "number") {
        return;
      }
      const code = node.children?.find(
        (child) => child.type === "element" && child.tagName === "code",
      );
      if (!code || !classNames(code).includes("language-mermaid")) {
        return;
      }
      replacements.push({ parent, index, chart: mermaidSource(code) });
    });

    for (const { parent, index, chart } of replacements) {
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "DocsMermaid",
        attributes: [chartAttr(chart)],
        children: [],
      };
    }
  };
}
