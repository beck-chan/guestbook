"use client";

import { useLayoutEffect } from "react";
import { useGuestbookSettings } from "@/lib/guestbookSettings";

const STYLE_ID = "guestbook-custom-theme";
const THEME_SCOPE = ".admin-page";
const HOIST_AT = /^@(?:import|charset|namespace|font-face|keyframes)\b/i;

function sanitizeCustomCss(css: string) {
  return css.replace(/<\/style/gi, "");
}

function splitCssBlocks(css: string) {
  const blocks: string[] = [];
  let i = 0;
  const n = css.length;

  while (i < n) {
    while (i < n && /\s/.test(css[i])) i += 1;
    if (i >= n) break;
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }

    const start = i;
    const isAt = css[i] === "@";
    let depth = 0;
    let inStr: string | null = null;

    while (i < n) {
      const c = css[i];
      if (inStr) {
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === inStr) inStr = null;
        i += 1;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        i += 1;
        continue;
      }
      if (c === "{") depth += 1;
      if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      if (isAt && c === ";" && depth === 0) {
        i += 1;
        break;
      }
      i += 1;
    }

    blocks.push(css.slice(start, i).trim());
  }

  return blocks.filter(Boolean);
}

function rewriteRootSelectors(block: string) {
  const brace = block.indexOf("{");
  if (brace === -1) {
    return block;
  }
  const prelude = block.slice(0, brace);
  const rest = block.slice(brace);
  return (
    prelude.replace(/(^|,)(\s*)(?::root\b|html\b|body\b)/g, "$1$2&") + rest
  );
}

function scopeCustomCss(css: string) {
  const blocks = splitCssBlocks(css);
  const hoisted: string[] = [];
  const scoped: string[] = [];

  for (const block of blocks) {
    if (HOIST_AT.test(block)) {
      hoisted.push(block);
    } else {
      scoped.push(rewriteRootSelectors(block));
    }
  }

  const wrapped = scoped.length
    ? `${THEME_SCOPE} {\n${scoped.join("\n\n")}\n}`
    : "";

  return [...hoisted, wrapped].filter(Boolean).join("\n\n");
}

export function CustomTheme() {
  const [settings] = useGuestbookSettings();
  const css = sanitizeCustomCss(settings.customTheme);

  useLayoutEffect(() => {
    const trimmed = css.trim();
    const existing = document.getElementById(STYLE_ID);

    if (!trimmed) {
      existing?.remove();
      return;
    }

    const style =
      existing instanceof HTMLStyleElement
        ? existing
        : document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = scopeCustomCss(trimmed);
    document.head.appendChild(style);
  }, [css]);

  return null;
}
