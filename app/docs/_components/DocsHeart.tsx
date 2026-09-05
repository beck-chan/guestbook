const HEART_PATH =
  "M203 462C98 386 0 259 0 139C0 118 3 97 10 76C26 27 63 0 104 0C152 0 205 40 225 130C226 134 229 136 232 136C235 136 238 134 239 131C268 43 318 6 362 6C400 6 433 34 442 81C445 96 446 110 446 125C446 265 313 391 203 462Z";

export function DocsHeart({
  filled = false,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={["docs-toc-heart", className].filter(Boolean).join(" ")}
      viewBox="-36 -36 518 534"
      aria-hidden="true"
    >
      {filled ? (
        <path fill="currentColor" d={HEART_PATH} />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="56"
          strokeLinecap="round"
          strokeLinejoin="round"
          d={HEART_PATH}
        />
      )}
    </svg>
  );
}
