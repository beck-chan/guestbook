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

export function DocsSearch({ variant }: { variant: "bar" | "icon" }) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        className="docs-search docs-search-icon"
        aria-label="Search docs"
      >
        <SearchGlyph />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="docs-search docs-search-bar"
      aria-label="Search docs"
    >
      <SearchGlyph />
      <span className="docs-search-label">Search</span>
    </button>
  );
}
