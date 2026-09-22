import { poemFlow } from "@/lib/poems";

export function PoemSection({ title, html }: { title: string; html: string }) {
  const items = poemFlow(html);
  const digits = Math.max(1, String(items.length).length);

  return (
    <section
      className="poem-piece"
      style={{ ["--poem-num-ch" as string]: `calc(${digits}ch + 0.15em)` }}
    >
      <h2 className="poem-title">{title}</h2>
      <div className="poem-body">
        {items.map((item, index) => (
          <div key={index} className="poem-line">
            <span className="poem-line-num" aria-hidden="true">
              {index + 1}
            </span>
            {item.kind === "line" ? (
              <span
                className="poem-line-text"
                dangerouslySetInnerHTML={{ __html: item.html }}
              />
            ) : (
              <span className="poem-line-text">{"\u00a0"}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
