import { flags } from "@/lib/flags";

export const SCALAR_CUSTOM_CSS = `
.scalar-app,
.scalar-app.light-mode {
  --scalar-font: var(--futura-font);
  --scalar-font-code: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --scalar-color-1: var(--cover, #0b2a12);
  --scalar-color-2: var(--ink-muted, #6a6864);
  --scalar-color-3: var(--ink-muted, #6a6864);
  --scalar-color-accent: var(--peony, #ff6162);
  --scalar-color-orange: var(--peony, #ff6162);
  --scalar-background-1: #fff;
  --scalar-background-2: var(--paper, #faf6ea);
  --scalar-background-3: var(--paper-hi, #f7f1e4);
  --scalar-border-color: var(--paper-dim, #e9e6df);
  --scalar-button-1: var(--peony, #ff6162);
  --scalar-button-1-hover: var(--peony-hot, #ff8586);
  --scalar-button-1-color: #fff;
}

.scalar-app,
.scalar-app *:not(code):not(pre):not(.hljs) {
  font-family: var(--futura-font) !important;
}

.scalar-app code,
.scalar-app pre,
.scalar-app .hljs,
.scalar-app code *,
.scalar-app pre *,
.scalar-app .hljs * {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace !important;
}

/* OpenAPI info.title stays in the spec; hide the on-page document H1. */
.scalar-app .introduction-section > h1,
.scalar-app .introduction-section h1,
.scalar-app .introduction h1 {
  display: none !important;
}

.scalar-app .introduction-section p,
.scalar-app .introduction-section .markdown p,
.scalar-app .introduction p {
  font-size: 1.2em !important;
  line-height: 1.35 !important;
}

/* Keep Scalar SearchButton mounted (cmd+K) but hide its own chrome. */
.scalar-app .t-doc__sidebar,
.scalar-app [class*="sidebar-search"] {
  display: none !important;
}

/* Match sidebar method colors on Scalar operation labels. */
.scalar-app .text-blue,
.scalar-app [style*="--scalar-color-blue"] {
  --method-color: color-mix(in srgb, #6f4e37 55%, white);
  color: color-mix(in srgb, #6f4e37 55%, white) !important;
}

.scalar-app .text-green,
.scalar-app [style*="--scalar-color-green"] {
  --method-color: color-mix(in srgb, var(--cover) 42%, white);
  color: color-mix(in srgb, var(--cover) 42%, white) !important;
}

.scalar-app .text-yellow,
.scalar-app [style*="--scalar-color-yellow"] {
  --method-color: var(--peony-soft);
  color: var(--peony-soft) !important;
}

.scalar-app .text-red,
.scalar-app [style*="--scalar-color-red"] {
  --method-color: var(--peony);
  color: var(--peony) !important;
}

.scalar-app .text-orange,
.scalar-app .border-orange,
.scalar-app [style*="--scalar-color-orange"] {
  color: var(--peony, #ff6162) !important;
  border-color: var(--peony, #ff6162) !important;
}

/* Match docs .docs-code highlighting (ink ground, foil/peony tokens). */
.scalar-app .scalar-card.dark-mode {
  --scalar-background-1: var(--docs-ink, #8a6a52);
  --scalar-background-2: var(--docs-ink, #8a6a52);
  --scalar-background-3: var(--docs-ink, #8a6a52);
  --scalar-color-1: var(--paper, #faf6ea);
  --scalar-color-2: var(--paper, #faf6ea);
  --scalar-color-3: color-mix(in srgb, var(--paper, #faf6ea) 48%, #6a6864);
}

.scalar-app code.hljs,
.scalar-app .hljs,
.scalar-app pre {
  background: var(--docs-ink, #8a6a52) !important;
  color: var(--paper, #faf6ea) !important;
}

.scalar-app .hljs-comment,
.scalar-app .hljs-quote {
  color: color-mix(in srgb, var(--paper, #faf6ea) 48%, #6a6864) !important;
  font-style: italic;
}

.scalar-app .hljs-keyword,
.scalar-app .hljs-selector-tag,
.scalar-app .hljs-literal,
.scalar-app .hljs-built_in,
.scalar-app .hljs-builtin-name {
  color: var(--foil-lit, #e8b85a) !important;
}

.scalar-app .hljs-string,
.scalar-app .hljs-title,
.scalar-app .hljs-name,
.scalar-app .hljs-type,
.scalar-app .hljs-section,
.scalar-app .hljs-regexp {
  color: var(--peony-soft, #ffb3ba) !important;
}

.scalar-app .hljs-attr,
.scalar-app .hljs-attribute,
.scalar-app .hljs-variable,
.scalar-app .hljs-template-variable,
.scalar-app .hljs-params {
  color: color-mix(in srgb, var(--paper, #faf6ea) 72%, var(--foil, #df9a49)) !important;
}

.scalar-app .hljs-number,
.scalar-app .hljs-symbol,
.scalar-app .hljs-bullet,
.scalar-app .hljs-link,
.scalar-app .hljs-meta,
.scalar-app .hljs-title.function_ {
  color: var(--foil, #df9a49) !important;
}
`;

export function createScalarReferenceConfig() {
  return {
    layout: "modern" as const,
    theme: "none" as const,
    hideClientButton: true,
    defaultOpenFirstTag: false,
    hideSearch: false,
    showOperationId: true,
    showSidebar: false,
    expandAllResponses: true,
    showDeveloperTools: "always" as const,
    operationTitleSource: "summary" as const,
    persistAuth: false,
    isEditable: false,
    hideModels: false,
    documentDownloadType: "none" as const,
    hideTestRequestButton: !flags.public,
    hideDarkModeToggle: true,
    withDefaultFonts: false,
    slug: "api",
    defaultOpenAllTags: true,
    expandAllModelSections: false,
    expandAllSchemaProperties: false,
    orderSchemaPropertiesBy: "alpha" as const,
    orderRequiredPropertiesFirst: true,
    darkMode: false,
    forceDarkModeState: "light" as const,
    modelsSectionLabel: "Models",
    customCss: SCALAR_CUSTOM_CSS,
  };
}
