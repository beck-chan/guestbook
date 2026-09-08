import { flags } from "@/lib/flags";

export const SCALAR_CUSTOM_CSS = `
.scalar-app,
.scalar-app.light-mode {
  --scalar-font: var(--futura-font);
  --scalar-font-code: var(--futura-font);
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
.scalar-app * {
  font-family: var(--futura-font) !important;
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
