type TocItem = {
  href: string;
  label: string;
};

const ITEMS_PER_NOTE = 3;

function chunkItems(items: TocItem[]) {
  const notes: TocItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_NOTE) {
    notes.push(items.slice(i, i + ITEMS_PER_NOTE));
  }
  return notes.length > 0 ? notes : [[]];
}

export function DocsToc({ items }: { items: TocItem[] }) {
  const notes = chunkItems(items);

  return (
    <nav className="docs-toc-stack" aria-label="Table of contents">
      {notes.map((group, index) => (
        <div
          key={group[0]?.href ?? index}
          className="docs-toc"
          style={{ zIndex: index + 1 }}
        >
          {index === 0 ? <p className="docs-toc-label">On this page</p> : null}
          <ol>
            {group.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </nav>
  );
}
