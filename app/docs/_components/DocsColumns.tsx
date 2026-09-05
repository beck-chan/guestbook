import type { CSSProperties } from "react";

const SPACE = /^(p|m)([atrblxy])(\d+(?:\.\d+)?)$/;

const SIDES = {
  a: ["Top", "Right", "Bottom", "Left"],
  t: ["Top"],
  r: ["Right"],
  b: ["Bottom"],
  l: ["Left"],
  x: ["Left", "Right"],
  y: ["Top", "Bottom"],
} as const;

function spaceStyle(space?: string): CSSProperties {
  const style: CSSProperties = {};
  if (!space) {
    return style;
  }

  for (const token of space.split(/\s+/)) {
    const match = token.match(SPACE);
    if (!match) {
      continue;
    }

    const prefix = match[1] === "p" ? "padding" : "margin";
    const value = `${match[3]}rem`;
    for (const side of SIDES[match[2] as keyof typeof SIDES]) {
      style[`${prefix}${side}`] = value;
    }
  }

  return style;
}

export function DocsColumns({
  space,
  children,
}: {
  space?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="docs-columns" style={spaceStyle(space)}>
      {children}
    </div>
  );
}

export function DocsColumn({
  width = "100",
  children,
}: {
  width?: string | number;
  children: React.ReactNode;
}) {
  const grow = Number.parseFloat(String(width));
  const flex = Number.isFinite(grow) && grow > 0 ? grow : 1;

  return (
    <div
      className="docs-column"
      style={{ flexGrow: flex, flexShrink: 1, flexBasis: 0 }}
    >
      {children}
    </div>
  );
}
