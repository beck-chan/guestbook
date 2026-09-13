"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

let mermaidLoader: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
  mermaidLoader ??= import("mermaid").then((mod) => mod.default);
  return mermaidLoader;
}

function cssColor(host: HTMLElement, value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  host.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

function mermaidConfigFor(host: HTMLElement) {
  const fontFamily = getComputedStyle(host).fontFamily;
  const heading = cssColor(host, "var(--docs-mermaid-heading)");
  const row = cssColor(host, "var(--docs-mermaid-row)");
  const border = cssColor(host, "var(--docs-mermaid-border)");
  const ink = cssColor(host, "var(--docs-mermaid-ink)");
  const title = cssColor(host, "var(--docs-mermaid-title)");

  return {
    theme: "base" as const,
    startOnLoad: false,
    fontFamily,
    fontSize: "18px",
    themeVariables: {
      darkMode: false,
      background: "#ffffff",
      fontFamily,
      fontSize: "18px",
      mainBkg: heading,
      primaryColor: heading,
      primaryTextColor: ink,
      primaryBorderColor: border,
      nodeBorder: border,
      nodeTextColor: ink,
      textColor: ink,
      titleColor: title,
      lineColor: border,
      defaultLinkColor: border,
      relationColor: border,
      arrowheadColor: border,
      tertiaryColor: heading,
      rowOdd: "#ffffff",
      rowEven: row,
      edgeLabelBackground: "#ffffff",
      clusterBkg: heading,
      clusterBorder: border,
    },
    er: {
      useMaxWidth: false,
    },
  };
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
  const style = typeof svg.getAttribute("style") === "string" ? svg.getAttribute("style") ?? "" : "";
  const maxWidth = Number(/max-width:\s*([\d.]+)px/i.exec(style)?.[1]);
  const width = Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : viewBoxWidth;
  if (Number.isFinite(width) && width > 0) {
    svg.setAttribute("width", String(width));
  }
}

function tintConnectors(svg: SVGSVGElement, border: string) {
  svg
    .querySelectorAll(
      ".relationshipLine, .edgePaths path, .edge-thickness-normal, .flowchart-link",
    )
    .forEach((node) => {
      node.setAttribute("stroke", border);
      (node as HTMLElement).style.stroke = border;
    });

  svg.querySelectorAll("marker path, marker line, .arrowMarkerPath").forEach((node) => {
    node.setAttribute("stroke", border);
    node.setAttribute("fill", "none");
    const el = node as HTMLElement;
    el.style.stroke = border;
    el.style.fill = "none";
  });

  svg.querySelectorAll("marker circle").forEach((node) => {
    node.setAttribute("stroke", border);
    node.setAttribute("fill", "#ffffff");
    const el = node as HTMLElement;
    el.style.stroke = border;
    el.style.fill = "#ffffff";
  });
}

function centerEntityHeadings(host: HTMLElement) {
  host.querySelectorAll("g.node").forEach((node) => {
    const name = node.querySelector(".name");
    const outer = node.querySelector(".outer-path");
    if (!name || !outer) {
      return;
    }

    const box = (outer as SVGGraphicsElement).getBBox();
    const transform = name.getAttribute("transform") ?? "";
    const translate = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);
    const y = translate?.[2] ?? "0";
    name.setAttribute("transform", `translate(${box.x}, ${y})`);

    const fo = name.querySelector("foreignObject");
    if (fo) {
      fo.setAttribute("x", "0");
      fo.setAttribute("width", String(box.width));
      fo.style.width = `${box.width}px`;
      fo.style.overflow = "visible";
      const inner = fo.querySelector("div, p, span") as HTMLElement | null;
      if (inner) {
        inner.style.width = "100%";
        inner.style.maxWidth = "none";
        inner.style.textAlign = "center";
        inner.style.whiteSpace = "nowrap";
        inner.style.overflow = "visible";
      }
    }

    name.querySelectorAll("text").forEach((text) => {
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("x", String(box.width / 2));
    });
  });
}

function fitLabelBoxes(host: HTMLElement, selector: string) {
  host.querySelectorAll(selector).forEach((label) => {
    const fo = label.querySelector("foreignObject");
    if (!fo) {
      return;
    }
    const inner = fo.querySelector("div, p, span") as HTMLElement | null;
    if (!inner) {
      return;
    }
    inner.style.whiteSpace = "nowrap";
    inner.style.width = "max-content";
    inner.style.maxWidth = "none";
    inner.style.overflow = "visible";
    const width = Math.ceil(
      Math.max(inner.scrollWidth, inner.offsetWidth, inner.getBoundingClientRect().width) + 16,
    );
    const height = Math.ceil(
      Math.max(inner.scrollHeight, inner.offsetHeight, inner.getBoundingClientRect().height) + 10,
    );
    if (width < 8 || height < 8) {
      return;
    }
    const prevW = parseFloat(fo.getAttribute("width") || "0");
    const prevH = parseFloat(fo.getAttribute("height") || "0");
    const prevX = parseFloat(fo.getAttribute("x") || "0");
    const prevY = parseFloat(fo.getAttribute("y") || "0");
    fo.setAttribute("width", String(width));
    fo.setAttribute("height", String(height));
    fo.style.width = `${width}px`;
    fo.style.height = `${height}px`;
    fo.style.overflow = "visible";
    if (prevW > 0) {
      fo.setAttribute("x", String(prevX - (width - prevW) / 2));
    }
    if (prevH > 0) {
      fo.setAttribute("y", String(prevY - (height - prevH) / 2));
    }
  });
}

function prepareSvg(svg: string, border: string) {
  const wrap = document.createElement("div");
  wrap.innerHTML = svg;
  const svgEl = wrap.querySelector("svg");
  if (svgEl) {
    pinMermaidSvgSize(svgEl);
    sanitizeSvgStyles(svgEl);
    tintConnectors(svgEl, border);
  }
  return wrap.innerHTML;
}

export function DocsMermaid({ chart }: { chart: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !chart.trim()) {
      return;
    }

    let cancelled = false;
    setSvg(null);
    setFailed(false);

    void loadMermaid()
      .then((mermaid) => {
        const config = mermaidConfigFor(host);
        mermaid.initialize(config);
        return mermaid
          .render(`mermaid-${reactId}`, chart)
          .then((result) => ({ result, border: config.themeVariables.lineColor }));
      })
      .then(({ result, border }) => {
        if (!cancelled) {
          setSvg(prepareSvg(result.svg, border));
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

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !svg) {
      return;
    }

    let cancelled = false;
    const run = () => {
      if (!cancelled) {
        fitLabelBoxes(host, ".edgeLabel");
        centerEntityHeadings(host);
      }
    };
    run();
    void document.fonts.ready.then(run);
    return () => {
      cancelled = true;
    };
  }, [svg]);

  if (failed) {
    return (
      <div className="docs-mermaid" role="status">
        Couldn’t render this diagram.
      </div>
    );
  }

  return (
    <div ref={hostRef} className="docs-mermaid" aria-busy={!svg}>
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : null}
    </div>
  );
}
