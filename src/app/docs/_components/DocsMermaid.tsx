"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import "../docs-mermaid.css";

let mermaidLoader: Promise<typeof import("mermaid").default> | undefined;
let mermaidQueue: Promise<unknown> = Promise.resolve();

function loadMermaid() {
  mermaidLoader ??= import("mermaid").then((mod) => mod.default);
  return mermaidLoader;
}

function renderChart(id: string, chart: string, host: HTMLElement) {
  const job = mermaidQueue.catch(() => undefined).then(async () => {
    const mermaid = await loadMermaid();
    const config = mermaidConfigFor(host);
    mermaid.initialize(config);
    const result = await mermaid.render(id, chart);
    return { result, border: config.themeVariables.lineColor };
  });
  mermaidQueue = job;
  return job;
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
    fontSize: 18,
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
      useMaxWidth: true,
      layoutDirection: "TB" as const,
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

const SVG_NS = "http://www.w3.org/2000/svg";

function labelText(node: Element) {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

function svgCenteredText(content: string, x: number, y: number) {
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "alphabetic");
  text.textContent = content;
  return text;
}

function placeCenteredText(group: Element, content: string, x: number, y: number) {
  const text = svgCenteredText(content, x, y);
  group.replaceChildren(text);
  try {
    const box = text.getBBox();
    if (Number.isFinite(box.height) && box.height > 1) {
      const visualMid = box.y + box.height / 2;
      text.setAttribute("y", String(y + (y - visualMid) + 3));
    }
  } catch {
    // SVG is hidden; the visible-tab observer will measure again.
  }
}

function headerBand(node: Element) {
  const outer = node.querySelector(".outer-path");
  if (!outer) {
    return null;
  }
  let box: DOMRect;
  try {
    box = (outer as SVGGraphicsElement).getBBox();
  } catch {
    return null;
  }
  if (!Number.isFinite(box.width) || box.width < 1) {
    return null;
  }
  let underlineY = box.y + Math.min(40, Math.max(28, box.height * 0.28));
  for (const divider of node.querySelectorAll(".divider")) {
    let band: DOMRect;
    try {
      band = (divider as SVGGraphicsElement).getBBox();
    } catch {
      continue;
    }
    const horizontal = band.height < 1.5 && band.width > box.width * 0.6;
    if (horizontal && band.y > box.y + 6 && band.y < box.y + box.height * 0.45) {
      underlineY = Math.min(underlineY, band.y);
    }
  }
  return { box, headerH: Math.max(underlineY - box.y, 24) };
}

function centerEntityHeadings(host: HTMLElement) {
  host.querySelectorAll("g.node").forEach((node) => {
    const name = node.querySelector(".name");
    const band = headerBand(node);
    if (!name || !band) {
      return;
    }
    const content = labelText(name);
    if (!content) {
      return;
    }
    name.removeAttribute("transform");
    placeCenteredText(
      name,
      content,
      band.box.x + band.box.width / 2,
      band.box.y + band.headerH / 2,
    );
  });
}

function centerEdgeLabels(host: HTMLElement) {
  host.querySelectorAll(".edgeLabel").forEach((label) => {
    const content = labelText(label);
    if (!content) {
      return;
    }
    placeCenteredText(label, content, 0, 0);
  });
}

function fitSvgCanvas(host: HTMLElement) {
  const svg = host.querySelector("svg");
  if (!svg) {
    return;
  }
  svg.style.overflow = "visible";
  let box: DOMRect;
  try {
    box = svg.getBBox();
  } catch {
    return;
  }
  if (!Number.isFinite(box.width) || box.width < 1 || !Number.isFinite(box.height) || box.height < 1) {
    return;
  }
  const padX = 10;
  const padY = 16;
  const x = box.x - padX;
  const y = box.y - padY;
  const width = box.width + padX * 2;
  const height = box.height + padY * 2;
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.removeAttribute("height");
  svg.style.width = `${width}px`;
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
}

function dropLayoutEdges(svg: SVGSVGElement) {
  const labelGroups = [...svg.querySelectorAll(".edgeLabels > g")];
  const pathGroups = [...svg.querySelectorAll(".edgePaths > *")];
  labelGroups.forEach((group, index) => {
    if (labelText(group) !== "layout") return;
    const id = group.getAttribute("id") ?? "";
    group.remove();
    pathGroups[index]?.remove();
    if (!id) return;
    for (const node of svg.querySelectorAll(`[id="${id}"]`)) {
      node.remove();
    }
  });
}

function prepareSvg(svg: string, border: string) {
  const wrap = document.createElement("div");
  wrap.innerHTML = svg;
  const svgEl = wrap.querySelector("svg");
  if (svgEl) {
    dropLayoutEdges(svgEl);
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

    void document.fonts.ready
      .then(() => renderChart(`mermaid-${reactId}`, chart, host))
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
      if (cancelled || host.closest("[hidden]")) {
        return;
      }
      centerEntityHeadings(host);
      centerEdgeLabels(host);
      fitSvgCanvas(host);
    };
    run();
    void document.fonts.ready.then(run);

    const panel = host.closest(".docs-tabset-panel");
    const observer = panel
      ? new MutationObserver(() => {
          requestAnimationFrame(run);
        })
      : null;
    if (panel) {
      observer?.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
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
