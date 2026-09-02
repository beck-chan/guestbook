import type { Poem } from "@/lib/poems";
import { EasterEgg } from "@/components/EasterEgg";
import { StickyNote } from "@/components/StickyNote";

type BookProps = {
  isOpen: boolean;
  poem?: Poem;
  onTurnPage: () => void;
  onToggle: () => void;
};

export function Book({ isOpen, poem, onTurnPage, onToggle }: BookProps) {
  return (
    <div className="book-scene" data-open={isOpen}>
      <div className={`book${isOpen ? " is-open" : ""}`}>
        <div className="page-left" aria-hidden="true">
          <div className="leaf leaf-left">
            <EasterEgg />
          </div>
        </div>
        <div className="page-right">
          <div className="leaf">
            {poem ? (
              <article className="leaf-copy" aria-hidden={!isOpen}>
                {poem.sections.map((section) => (
                  <section key={section.title} className="poem-piece">
                    <h2 className="poem-title">{section.title}</h2>
                    <div
                      className="poem-body"
                      dangerouslySetInnerHTML={{ __html: section.html }}
                    />
                  </section>
                ))}
              </article>
            ) : null}
            <div className="poem-heart-stack">
              <button
                type="button"
                className="poem-heart"
                disabled={!isOpen}
                tabIndex={isOpen ? 0 : -1}
                aria-label="Heart this poem, 0 hearts"
                aria-pressed="false"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
                </svg>
              </button>
              <span className="poem-heart-count" aria-hidden="true">
                0
              </span>
            </div>
            <button
              type="button"
              className="dog-ear"
              onClick={onTurnPage}
              disabled={!isOpen}
              tabIndex={isOpen ? 0 : -1}
              aria-label="Turn Page"
            >
              <span className="dog-ear-flap" />
              <span className="dog-ear-label">
                Turn
                <br />
                Page
              </span>
            </button>
          </div>
        </div>
        <div className="cover">
          <div className="cover-front">
            <div className="cover-copy">
              <h1 className="cover-title">ORIGINAL POETRY</h1>
              <p className="cover-author">by Beck Chan</p>
            </div>
          </div>
          <div className="cover-inside" aria-hidden={!isOpen}>
            <div className="leaf leaf-left">
              <EasterEgg />
            </div>
          </div>
        </div>
        <StickyNote isOpen={isOpen} onToggle={onToggle} />
      </div>
    </div>
  );
}
