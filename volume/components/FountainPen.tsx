type FountainPenProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function FountainPen({ isOpen, onToggle }: FountainPenProps) {
  const label = isOpen ? "CLOSE BOOK" : "OPEN BOOK";

  return (
    <button
      type="button"
      className={`pen-control${isOpen ? " is-stowed" : ""}`}
      onClick={onToggle}
      aria-label={isOpen ? "Close Book" : "Open Book"}
      aria-pressed={isOpen}
    >
      <span className="pen-glyph">
        <svg
          className="pen-svg"
          viewBox="0 0 64 320"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="pen-barrel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1a1410" />
              <stop offset="40%" stopColor="#3b2f28" />
              <stop offset="70%" stopColor="#1f1915" />
              <stop offset="100%" stopColor="#0d0b09" />
            </linearGradient>
            <linearGradient id="pen-gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8a6a1f" />
              <stop offset="45%" stopColor="#e6c86a" />
              <stop offset="100%" stopColor="#9a761f" />
            </linearGradient>
            <path id="barrel-label-path" d="M32 186 L32 62" />
          </defs>
          <rect x="22" y="8" width="20" height="36" rx="3" fill="url(#pen-gold)" />
          <rect x="24" y="12" width="16" height="28" rx="2" fill="#1a1410" />
          <rect x="20" y="42" width="24" height="8" rx="1" fill="url(#pen-gold)" />
          <rect x="17" y="50" width="30" height="148" rx="6" fill="url(#pen-barrel)" />
          <text
            className="pen-inscription"
            fontSize={9}
            letterSpacing={1.1}
            fontWeight={600}
          >
            <textPath
              href="#barrel-label-path"
              startOffset="50%"
              textAnchor="middle"
            >
              {label}
            </textPath>
          </text>
          <rect x="20" y="198" width="24" height="10" rx="1" fill="url(#pen-gold)" />
          <path d="M22 208 h20 l-4 18 h-12 z" fill="#2a221c" />
          <path d="M24 226 h16 l-8 58 z" fill="url(#pen-gold)" />
          <path d="M32 232 v44" stroke="#5c4a1a" strokeWidth="1.2" />
          <circle cx="32" cy="248" r="3" fill="#3d2e10" />
        </svg>
      </span>
    </button>
  );
}
