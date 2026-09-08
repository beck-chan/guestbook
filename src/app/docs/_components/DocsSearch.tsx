function SearchGlyph() {
  return (
    <svg
      className="docs-search-glyph"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M15.4 15.4 20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function openScalarSearch() {
  const host = document.querySelector(".docs-api-reference, .scalar-app");
  const trigger = host?.querySelector<HTMLElement>(
    'button[aria-label*="Search" i], button[class*="search" i], [class*="sidebar-search"] button',
  );
  if (trigger) {
    trigger.click();
    return;
  }

  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    }),
  );
}

export function DocsSearch({
  variant,
  onClick,
  label = "Search docs",
}: {
  variant: "bar" | "icon";
  onClick?: () => void;
  label?: string;
}) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        className="docs-search docs-search-icon"
        aria-label={label}
        onClick={onClick}
      >
        <SearchGlyph />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="docs-search docs-search-bar"
      aria-label={label}
      onClick={onClick}
    >
      <SearchGlyph />
      <span className="docs-search-label">Search</span>
    </button>
  );
}
