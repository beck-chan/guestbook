// Path from Bootstrap Icons `bi-lock-fill` (MIT): https://icons.getbootstrap.com/icons/lock-fill/
const LOCK_PATH =
  "M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4m0 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3";

export function DocsLock({ className }: { className?: string }) {
  return (
    <svg
      className={["docs-inline-lock", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 16"
      role="img"
      aria-label="lock"
    >
      <path fill="currentColor" fillRule="evenodd" d={LOCK_PATH} />
    </svg>
  );
}
