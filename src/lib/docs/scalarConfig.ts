import { flags } from "@/lib/flags";

export const SCALAR_CUSTOM_CSS = `
.scalar-app {
  --scalar-font: var(--futura-font);
  --scalar-font-code: var(--futura-font);
  --scalar-color-1: var(--cover, #0b2a12);
  --scalar-color-2: var(--ink-muted, #6a6864);
  --scalar-color-3: var(--ink-muted, #6a6864);
  --scalar-color-accent: var(--peony, #ff6162);
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
`;

export function createScalarReferenceConfig() {
  return {
    layout: "modern" as const,
    theme: "none" as const,
    hideClientButton: true,
    defaultOpenFirstTag: false,
    hideSearch: true,
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
