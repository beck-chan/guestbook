import type { ReactNode } from "react";

function LegendMark({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <svg className="docs-erd-legend-mark" viewBox="0 0 52 18" aria-hidden="true">
      {children}
    </svg>
  );
}

function ZeroOrOne() {
  return (
    <LegendMark>
      <line x1="6" y1="9" x2="46" y2="9" strokeDasharray="3.5 2.75" />
      <line x1="14" y1="3.5" x2="14" y2="14.5" />
      <circle cx="20" cy="9" r="3" />
    </LegendMark>
  );
}

function ExactlyOne() {
  return (
    <LegendMark>
      <line x1="6" y1="9" x2="46" y2="9" />
      <line x1="14" y1="3.5" x2="14" y2="14.5" />
      <line x1="18.5" y1="3.5" x2="18.5" y2="14.5" />
    </LegendMark>
  );
}

function ZeroOrMore() {
  return (
    <LegendMark>
      <line x1="22" y1="9" x2="46" y2="9" />
      <circle cx="25" cy="9" r="3" />
      <path d="M22 9 L8 3.5 M22 9 L8 9 M22 9 L8 14.5" />
    </LegendMark>
  );
}

function Identifying() {
  return (
    <LegendMark>
      <line x1="6" y1="9" x2="46" y2="9" />
    </LegendMark>
  );
}

function NonIdentifying() {
  return (
    <LegendMark>
      <line x1="6" y1="9" x2="46" y2="9" strokeDasharray="3.5 2.75" />
    </LegendMark>
  );
}

const ITEMS = [
  { mark: <ZeroOrOne />, label: "zero or one" },
  { mark: <ExactlyOne />, label: "exactly one" },
  { mark: <ZeroOrMore />, label: "zero or more" },
  { mark: <Identifying />, label: "identifying" },
  { mark: <NonIdentifying />, label: "non-identifying" },
] as const;

export function DocsErdLegend() {
  return (
    <aside className="docs-erd-legend" aria-label="Entity-relationship legend">
      <p className="docs-erd-legend-title">Legend</p>
      <ul className="docs-erd-legend-list">
        {ITEMS.map((item) => (
          <li key={item.label} className="docs-erd-legend-item">
            {item.mark}
            <span>{item.label}</span>
          </li>
        ))}
        <li className="docs-erd-legend-item">
          <span className="docs-erd-legend-pk">PK</span>
          <span>primary key</span>
        </li>
      </ul>
    </aside>
  );
}
