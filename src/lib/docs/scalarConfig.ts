import { flags } from "@/lib/flags";
import { envSupabaseProjectRef, publicApiServers } from "./publicApiServers";
import {
  applyRememberedApiKey,
  createAlwaysSendApiKeyPlugin,
  type ScalarRequestBuilder,
} from "./scalarApiKey";

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
  --scalar-content-max-width: 1540px;
  --refs-content-max-width: 100%;
}

.scalar-app,
.scalar-app *:not(code):not(pre):not(.hljs):not(h3) {
  font-family: var(--futura-font) !important;
}

.scalar-app code,
.scalar-app pre,
.scalar-app .hljs,
.scalar-app code *,
.scalar-app pre *,
.scalar-app .hljs *,
.scalar-app .cm-editor,
.scalar-app .cm-editor * {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace !important;
}

/* OpenAPI info.title stays in the spec; hide the on-page document H1
   and collapse the heading slot / intro padding it occupied. */
.scalar-app .introduction-section > h1,
.scalar-app .introduction-section h1,
.scalar-app .introduction h1 {
  display: none !important;
}

.scalar-app .introduction-section,
.scalar-app .introduction,
.scalar-app [id="description"] {
  padding-top: 1.35rem !important;
  margin-top: 0 !important;
}

.scalar-app .introduction-section .section-header,
.scalar-app .introduction-section header:has(> h1) {
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

.scalar-app .introduction-section .markdown > :first-child,
.scalar-app .introduction .markdown > :first-child {
  margin-top: 0 !important;
}

.scalar-app .introduction-section p,
.scalar-app .introduction-section .markdown p,
.scalar-app .introduction p {
  font-size: 1.2em !important;
  line-height: 1.35 !important;
}

/* Match docs .docs-subheading for markdown ### in API descriptions. */
.scalar-app .markdown h3,
.scalar-app .introduction-section h3,
.scalar-app .introduction h3 {
  scroll-margin-top: 1.25rem !important;
  margin: 1.75rem 0 0 !important;
  color: color-mix(in srgb, #6f4e37 48%, white) !important;
  font-family: var(--peony-font) !important;
  font-size: clamp(1.35rem, 2vw, 1.7rem) !important;
  font-weight: 400 !important;
  letter-spacing: 0.02em !important;
  line-height: 1.2 !important;
}

.scalar-app .introduction-section .markdown > h3:first-child,
.scalar-app .introduction .markdown > h3:first-child,
.scalar-app [id="description"] .markdown > h3:first-child {
  margin-bottom: 1.35rem !important;
}

/* Match docs-article numbered lists in Scalar markdown. */
.scalar-app .markdown ol,
.scalar-app .introduction-section ol,
.scalar-app .introduction ol {
  margin: 1.1rem 0 0 !important;
  padding: 0 0 0 2.35rem !important;
  list-style: decimal !important;
  list-style-position: outside !important;
  color: inherit !important;
  font-family: var(--body-font) !important;
  font-size: clamp(1rem, 1.5vw, 1.28rem) !important;
  font-weight: 400 !important;
  font-variant-numeric: lining-nums !important;
  line-height: 1.55 !important;
}

.scalar-app .markdown ol ol,
.scalar-app .introduction-section ol ol {
  list-style-type: lower-alpha !important;
}

.scalar-app .markdown ol ol ol,
.scalar-app .introduction-section ol ol ol {
  list-style-type: lower-roman !important;
}

.scalar-app .markdown ol > li,
.scalar-app .introduction-section ol > li,
.scalar-app .introduction ol > li {
  padding-left: 0.2em !important;
  color: inherit !important;
  font-family: var(--body-font) !important;
  font-size: clamp(1rem, 1.5vw, 1.28rem) !important;
  font-weight: 400 !important;
  font-variant-numeric: lining-nums !important;
  line-height: 1.55 !important;
}

.scalar-app .markdown ol > li + li,
.scalar-app .introduction-section ol > li + li {
  margin-top: 0.28rem !important;
}

.scalar-app .markdown ol > li::marker,
.scalar-app .introduction-section ol > li::marker,
.scalar-app .introduction ol > li::marker,
.scalar-app .markdown ol > li::before,
.scalar-app .introduction-section ol > li::before {
  color: color-mix(in srgb, #6f4e37 55%, white) !important;
  font-family: var(--peony-font) !important;
  font-size: 1.35em !important;
  font-weight: 400 !important;
  font-variant-numeric: lining-nums !important;
  letter-spacing: 0.02em !important;
  line-height: 1.55 !important;
}

.scalar-app .markdown ol > li > p {
  margin: 0 !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

.scalar-app .introduction-section .markdown ol p,
.scalar-app .introduction .markdown ol p {
  font-size: clamp(1rem, 1.5vw, 1.28rem) !important;
  line-height: 1.55 !important;
}

.scalar-app .markdown li > ol,
.scalar-app .markdown li > ul {
  margin-top: 0.65rem !important;
  margin-bottom: 0.25rem !important;
  margin-left: 0 !important;
  padding-left: 0.65rem !important;
}

/* Match docs .docs-callout for markdown blockquotes and GitHub alerts. */
.scalar-app .markdown blockquote,
.scalar-app .markdown .markdown-alert,
.scalar-app .markdown .admonition {
  box-sizing: border-box;
  display: block !important;
  margin: 1.1rem 0 0 1.5rem !important;
  padding: 0.85rem 1.1rem 1.05rem !important;
  border: 1px solid color-mix(in srgb, #6f4e37 28%, white) !important;
  border-radius: 0.4rem !important;
  background: transparent !important;
  color: inherit !important;
  font-style: normal !important;
}

.scalar-app .markdown-alert-title,
.scalar-app .admonition-title,
.scalar-app .markdown-alert-icon {
  display: none !important;
}

.scalar-app .markdown blockquote > :first-child,
.scalar-app .markdown .markdown-alert > :first-child,
.scalar-app .markdown .admonition > :first-child {
  margin-top: 0 !important;
}

.scalar-app .markdown blockquote p,
.scalar-app .markdown .markdown-alert p {
  margin: 0 !important;
  font-size: clamp(1rem, 1.5vw, 1.28rem) !important;
  line-height: 1.55 !important;
}

.scalar-app .markdown blockquote p + p,
.scalar-app .markdown .markdown-alert p + p {
  margin-top: 0.5rem !important;
}

/* Callout # title: body font, same size as docs .docs-callout .docs-title. */
.scalar-app .markdown blockquote h3,
.scalar-app .markdown .markdown-alert h3,
.scalar-app .markdown .admonition h3 {
  margin: 0 0 0.85rem !important;
  color: color-mix(in srgb, #6f4e37 48%, white) !important;
  font-family: var(--futura-font) !important;
  font-size: clamp(1.08rem, 1.55vw, 1.32rem) !important;
  font-weight: 400 !important;
  letter-spacing: 0.02em !important;
  line-height: 1.2 !important;
}

/* Keep Scalar SearchButton mounted (cmd+K / docs search) but hide its chrome.
   Modern layout always mounts a sticky .t-doc__header below Tailwind lg
   (1000px), even with showSidebar: false. That bar sits in the page and
   sticks over the docs topbar on scroll. SearchModal still portals to body. */
.scalar-app .t-doc__sidebar,
.scalar-app .t-doc__header,
.scalar-app [class*="sidebar-search"] {
  display: none !important;
}

/* Operation rows keep the path; hide callout/markdown description snippets. */
a[role="option"][data-docs-hide-op-desc="true"] .text-c-2 {
  display: none !important;
}

/* Match docs-search-dialog: size, sharp box, fonts. Modal portals to body. */
.scalar-modal.scalar-modal-search,
.scalar-modal-search {
  box-sizing: border-box !important;
  width: min(36rem, calc(100vw - 2rem)) !important;
  max-width: min(36rem, calc(100vw - 2rem)) !important;
  max-height: min(28rem, calc(100vh - 4rem)) !important;
  margin-top: min(12vh, 5.5rem) !important;
  padding: 0.7rem !important;
  border: 1px solid #c9c5bc !important;
  border-radius: 1px !important;
  background: #fff !important;
  color: var(--docs-ink, #8a6a52) !important;
  box-shadow: 0 16px 40px rgb(47 46 44 / 0.22) !important;
  font-family: var(--body-font) !important;
  overflow: hidden !important;
}

.scalar-modal-search .scalar-modal-body {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.55rem !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  font-family: var(--body-font) !important;
}

/* Drop Navigate / Select keyboard hint bar. */
.scalar-modal-search .ref-search-meta,
.ref-search-meta {
  display: none !important;
}

/* Search field chrome like .docs-search-dialog-bar */
.scalar-modal-search [role="search"] > label {
  height: auto !important;
  margin: 0 !important;
  padding: 0.15rem 0.25rem 0.15rem 0.45rem !important;
  border: 1px solid #c9c5bc !important;
  border-radius: 1px !important;
  background: #fff !important;
  color: var(--docs-ink, #8a6a52) !important;
  font-family: var(--body-font) !important;
  font-size: 1.05rem !important;
  font-weight: 400 !important;
  line-height: 1.35 !important;
}

.scalar-modal-search [role="search"] input {
  padding: 0.55rem 0.25rem !important;
  color: var(--docs-ink, #8a6a52) !important;
  font-family: var(--body-font) !important;
  font-size: 1.05rem !important;
  font-weight: 400 !important;
  line-height: 1.35 !important;
}

.scalar-modal-search [role="search"] input::placeholder {
  color: color-mix(in srgb, #6f4e37 48%, white);
  opacity: 1;
}

.scalar-modal-search [role="search"] svg {
  color: color-mix(in srgb, #6f4e37 48%, white) !important;
}

.scalar-modal-search [role="listbox"] {
  min-height: 0 !important;
  overflow: auto !important;
  font-family: var(--body-font) !important;
}

.scalar-modal-search a[role="option"] {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 0.55rem !important;
  padding: 0.55rem 0.65rem !important;
  border-radius: 1px !important;
  color: var(--docs-ink, #8a6a52) !important;
  font-family: var(--poem-font) !important;
  font-size: 1.05rem !important;
  font-weight: 400 !important;
  line-height: 1.35 !important;
  text-decoration: none !important;
}

.scalar-modal-search a[role="option"]:hover,
.scalar-modal-search a[role="option"]:focus-visible,
.scalar-modal-search a[role="option"][aria-selected="true"] {
  background: rgb(47 46 44 / 0.06) !important;
  color: var(--cover-soft, #6f4e37) !important;
  text-decoration: none !important;
}

/* Result title ~ .docs-search-hit-heading */
.scalar-modal-search a[role="option"] .flex-1,
.scalar-modal-search a[role="option"] .flex-1.truncate.font-medium,
.scalar-modal-search a[role="option"] .font-medium,
.scalar-modal-search a[role="option"] [class*="truncate"]:not(.text-c-2) {
  order: 1;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  color: inherit !important;
  font-family: var(--poem-font) !important;
  font-size: 1.05rem !important;
  font-weight: 400 !important;
  line-height: 1.35 !important;
}

/* Result meta ~ .docs-search-hit-meta */
.scalar-modal-search a[role="option"] .text-c-2 {
  color: color-mix(in srgb, #6f4e37 48%, white) !important;
  font-family: var(--body-font) !important;
  font-size: 0.95rem !important;
  font-weight: 400 !important;
  line-height: 1.25 !important;
}

/* Type icons on the right, like a trailing glyph. */
.scalar-modal-search a[role="option"]:has(> .sr-only) > :nth-child(2),
.scalar-modal-search a[role="option"]:not(:has(> .sr-only)) > :first-child {
  order: 2;
  flex: 0 0 auto !important;
  margin-left: auto !important;
}

.scalar-modal-search a[role="option"][data-docs-hide-heading="true"] {
  display: none !important;
}

.scalar-app.scalar-api-reference,
.scalar-app .references-layout {
  --scalar-header-height: 0px;
}

.scalar-app .section-container {
  padding-inline: 0 !important;
}

.scalar-app .section {
  margin-inline: 0 !important;
  max-width: 100% !important;
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
  --scalar-color-3: var(--paper, #faf6ea);
}

.scalar-app code.hljs,
.scalar-app .hljs,
.scalar-app pre {
  background: var(--docs-ink, #8a6a52) !important;
  color: var(--paper, #faf6ea) !important;
}

.scalar-app .response-card .scalar-card-header,
.scalar-app .response-card .scalar-card-footer,
.scalar-app .response-card .response-card-footer {
  background: var(--paper, #faf6ea) !important;
  color: var(--cover, #0b2a12) !important;
}

.scalar-app .response-card > .scalar-card-content.grid,
.scalar-app .response-card .scalar-code-block {
  background: var(--docs-ink, #8a6a52) !important;
}

/* Test Request empty body ("No Body") — Scalar .text-c-3, cream like the docs sidenav. */
.scalar-app .text-c-3.flex.min-h-10,
.scalar-app .text-c-3.flex.items-center.justify-center,
.scalar-app .scalar-card.dark-mode .text-c-3 {
  color: var(--paper, #faf6ea) !important;
}

.scalar-app .response-card .scalar-code-block pre,
.scalar-app .response-card .scalar-code-block code.hljs,
.scalar-app .response-card .scalar-code-block .hljs {
  background: transparent !important;
}

.scalar-app .scalar-code-copy,
.scalar-app .code-copy,
.scalar-app .scalar-code-copy-backdrop {
  background: var(--paper, #faf6ea) !important;
  color: var(--peony, #ff6162) !important;
  border-radius: 0.35rem;
  padding-top: 0;
}

.scalar-app .scalar-code-copy-backdrop {
  top: -2px !important;
  right: -4px !important;
}

.scalar-app .scalar-code-copy svg,
.scalar-app .code-copy svg,
.scalar-app .scalar-code-copy *:not(.scalar-code-copy-backdrop),
.scalar-app .code-copy *:not(.scalar-code-copy-backdrop) {
  color: var(--peony, #ff6162) !important;
  fill: var(--peony, #ff6162) !important;
}

.scalar-app .scalar-code-copy:hover,
.scalar-app .code-copy:hover,
.scalar-app .scalar-code-copy:focus-visible,
.scalar-app .code-copy:focus-visible,
.scalar-app .scalar-code-copy:hover .scalar-code-copy-backdrop,
.scalar-app .scalar-code-copy:focus-visible .scalar-code-copy-backdrop {
  background: var(--paper, #faf6ea) !important;
}

.scalar-app .scalar-code-copy:hover *:not(.scalar-code-copy-backdrop),
.scalar-app .code-copy:hover *:not(.scalar-code-copy-backdrop),
.scalar-app .scalar-code-copy:focus-visible *:not(.scalar-code-copy-backdrop),
.scalar-app .code-copy:focus-visible *:not(.scalar-code-copy-backdrop) {
  color: var(--peony-hot, #ff8586) !important;
  fill: var(--peony-hot, #ff8586) !important;
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

/* Try it / CodeMirror response preview — same tokens as .docs-code. */
.scalar-app .cm-editor,
.scalar-app .cm-scroller,
.scalar-app .cm-gutters,
.scalar-app .cm-content {
  background: var(--docs-ink, #8a6a52) !important;
  color: var(--paper, #faf6ea) !important;
  --scalar-background-1: var(--docs-ink, #8a6a52);
  --scalar-background-2: var(--docs-ink, #8a6a52);
  --scalar-background-3: var(--docs-ink, #8a6a52);
  --scalar-color-1: color-mix(in srgb, var(--paper, #faf6ea) 72%, var(--foil, #df9a49));
  --scalar-color-2: var(--paper, #faf6ea);
  --scalar-color-3: color-mix(in srgb, var(--paper, #faf6ea) 48%, #6a6864);
  --scalar-color-blue: var(--peony-soft, #ffb3ba);
  --scalar-color-green: var(--foil-lit, #e8b85a);
  --scalar-color-orange: var(--foil, #df9a49);
  --scalar-color-purple: var(--foil-lit, #e8b85a);
}

.scalar-app .cm-gutters {
  border: 0 !important;
}

.scalar-app .cm-gutterElement,
.scalar-app .cm-lineNumbers .cm-gutterElement {
  color: color-mix(in srgb, var(--paper, #faf6ea) 48%, #6a6864) !important;
}

.scalar-app .cm-foldPlaceholder,
.scalar-app .cm-foldGutter span {
  color: var(--peony-soft, #ffb3ba) !important;
}

.scalar-app .cm-editor .tok-string,
.scalar-app .cm-editor .cm-string,
.scalar-app .cm-string {
  color: var(--peony-soft, #ffb3ba) !important;
}

.scalar-app .cm-editor .tok-propertyName,
.scalar-app .cm-editor .tok-attributeName,
.scalar-app .cm-editor .tok-variableName,
.scalar-app .cm-property {
  color: color-mix(in srgb, var(--paper, #faf6ea) 72%, var(--foil, #df9a49)) !important;
}

.scalar-app .cm-editor .tok-keyword,
.scalar-app .cm-editor .tok-bool,
.scalar-app .cm-editor .tok-atom,
.scalar-app .cm-editor .tok-literal,
.scalar-app .cm-keyword {
  color: var(--foil-lit, #e8b85a) !important;
}

.scalar-app .cm-editor .tok-number,
.scalar-app .cm-number {
  color: var(--foil, #df9a49) !important;
}

.scalar-app .cm-editor .tok-punctuation,
.scalar-app .cm-editor .tok-bracket,
.scalar-app .cm-editor .tok-separator,
.scalar-app .cm-bracket,
.scalar-app .cm-punctuation {
  color: var(--paper, #faf6ea) !important;
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
    showDeveloperTools: "localhost" as const,
    operationTitleSource: "summary" as const,
    persistAuth: false,
    authentication: {
      preferredSecurityScheme: "apikey",
    },
    plugins: [createAlwaysSendApiKeyPlugin()],
    onBeforeRequest: ({ requestBuilder }: { requestBuilder: ScalarRequestBuilder }) => {
      applyRememberedApiKey(requestBuilder);
    },
    isEditable: false,
    hideModels: false,
    documentDownloadType: "none" as const,
    hideTestRequestButton: !(flags.public || flags.apiTest),
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
    localization: {
      translations: {
        search: {
          placeholder: "Search API",
        },
      },
    },
    ...(flags.public
      ? { servers: publicApiServers() }
      : flags.apiTest
        ? { servers: publicApiServers(envSupabaseProjectRef()) }
        : {}),
  };
}
