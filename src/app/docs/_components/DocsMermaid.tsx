"use client";

import { useEffect, useId, useState } from "react";

const MERMAID_CONFIG = {
  theme: "neutral" as const,
  startOnLoad: false,
  fontFamily: "Arial, Helvetica, sans-serif",
  er: {
    useMaxWidth: false,
  },
};

let mermaidLoader: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
  mermaidLoader ??= import("mermaid").then((mod) => {
    mod.default.initialize(MERMAID_CONFIG);
    return mod.default;
  });
  return mermaidLoader;
}

function isParsableStyle(style: string) {
  const trimmed = style.trim();
  if (!trimmed || trimmed.includes("undefined")) {
    return false;
  }
  return trimmed.split(";").every((part) => {
    const declaration = part.trim();
    return !declaration || declaration.includes(":");
  });
}

function sanitizeSvgStyles(root: Element) {
  for (const node of root.querySelectorAll("[style]")) {
    const style = node.getAttribute("style");
    if (style && !isParsableStyle(style)) {
      node.removeAttribute("style");
    }
  }
}

function pinMermaidSvgSize(svg: SVGSVGElement) {
  const viewBox = svg.getAttribute("viewBox") ?? "";
  const parts = viewBox.trim().split(/[\s,]+/);
  const viewBoxWidth = parts.length === 4 ? Number(parts[2]) : Number.NaN;
  const style = svg.getAttribute("style") ?? "";
  const maxWidth = Number(/max-width:\s*([\d.]+)px/i.exec(style)?.[1]);
  const width = Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : viewBoxWidth;
  if (Number.isFinite(width) && width > 0) {
    svg.setAttribute("width", String(width));
  }
}

function prepareSvg(svg: string) {
  const wrap = document.createElement("div");
  wrap.innerHTML = svg;
  const svgEl = wrap.querySelector("svg");
  if (svgEl) {
    pinMermaidSvgSize(svgEl);
    sanitizeSvgStyles(svgEl);
  }
  return wrap.innerHTML;
}

export function DocsMermaid({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!chart.trim()) {
      return;
    }

    let cancelled = false;
    setSvg(null);
    setFailed(false);

    void loadMermaid()
      .then((mermaid) => mermaid.render(`mermaid-${reactId}`, chart))
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(prepareSvg(rendered));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (failed) {
    return (
      <div className="docs-mermaid" role="status">
        Couldn’t render this diagram.
      </div>
    );
  }

  if (!svg) {
    return <div className="docs-mermaid" aria-busy="true" />;
  }

  return (
    <div
      className="docs-mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
