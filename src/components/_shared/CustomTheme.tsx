"use client";

import type { CSSProperties } from "react";
import {
  guestbookThemeVars,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

const STYLE_ID = "guestbook-custom-theme";
const VARS_ID = "guestbook-theme-vars";
const THEME_SCOPE = ".admin-page";
const HOIST_AT =
  /^@(?:import|charset|namespace|font-face|keyframes|property)\b/i;
const GROUP_AT = /^@(?:media|supports|container|layer|scope)\b/i;

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

function firstCompound(selector: string) {
  return selector.match(/^[^\s>+~]+/)?.[0] ?? selector;
}

function alreadyScoped(compound: string) {
  return (
    compound === THEME_SCOPE ||
    compound.startsWith(`${THEME_SCOPE}.`) ||
    compound.startsWith(`${THEME_SCOPE}:`) ||
    compound.startsWith(`${THEME_SCOPE}[`)
  );
}

function scopeSelector(selector: string) {
  const sel = selector.trim();
  if (!sel) {
    return sel;
  }
  if (/^(:root|html|body)\b/.test(sel)) {
    return sel.replace(/^(:root|html|body)\b/, THEME_SCOPE);
  }

  const first = firstCompound(sel);
  if (alreadyScoped(first)) {
    return sel;
  }

  const descendant = `${THEME_SCOPE} ${sel}`;
  // /admin puts guestbook-themed on the same node as admin-page; /guestbook nests it.
  if (/^[.#[]/.test(first)) {
    return `${THEME_SCOPE}${first}${sel.slice(first.length)}, ${descendant}`;
  }
  return descendant;
}

function scopePrelude(prelude: string) {
  return prelude.split(",").map(scopeSelector).filter(Boolean).join(", ");
}

function rewriteBlock(block: string): string {
  if (HOIST_AT.test(block)) {
    return block;
  }

  const brace = block.indexOf("{");
  if (brace === -1) {
    return block;
  }

  if (GROUP_AT.test(block)) {
    const close = block.lastIndexOf("}");
    const inner = close === -1 ? "" : block.slice(brace + 1, close);
    return `${block.slice(0, brace + 1)}\n${rewriteBlocks(inner)}\n}`;
  }

  return `${scopePrelude(block.slice(0, brace))}${block.slice(brace)}`;
}

function rewriteBlocks(css: string) {
  return splitCssBlocks(css).map(rewriteBlock).join("\n\n");
}

function rewriteCustomCss(css: string) {
  return rewriteBlocks(css);
}

function cssDeclarations(vars: CSSProperties) {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}

export function CustomTheme() {
  const [settings] = useGuestbookSettings();
  const varsCss = cssDeclarations(guestbookThemeVars(settings));
  const css = sanitizeCustomCss(settings.customTheme).trim();

  return (
    <>
      <style id={VARS_ID}>
        {`.admin-page, .guestbook-themed { ${varsCss} }`}
      </style>
      {css ? (
        <style
          id={STYLE_ID}
          dangerouslySetInnerHTML={{ __html: rewriteCustomCss(css) }}
        />
      ) : null}
    </>
  );
}
