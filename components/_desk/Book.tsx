import type { Poem } from "@/lib/poems";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { EasterEgg } from "@/components/_desk/EasterEgg";
import { PoemHeartTotal } from "@/components/_desk/PoemHeartTotal";
import { StickyNote } from "@/components/_desk/StickyNote";

type BookProps = {
  isOpen: boolean;
  poem?: Poem;
  onTurnPage: () => void;
  onToggle: () => void;
  heartCount?: number;
  totalHearts?: number;
  liked?: boolean;
  onToggleHeart?: () => void;
  heartPending?: boolean;
};

export function Book({
  isOpen,
  poem,
  onTurnPage,
  onToggle,
  heartCount = 0,
  totalHearts = 0,
  liked = false,
  onToggleHeart,
  heartPending = false,
}: BookProps) {
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
                disabled={!isOpen || heartPending || !poem}
                tabIndex={isOpen ? 0 : -1}
                aria-label={`Heart this poem, ${heartCount} hearts`}
                aria-pressed={liked}
                onClick={onToggleHeart}
              >
                <DocsHeart filled={liked} className="poem-heart-icon" />
              </button>
              <span className="poem-heart-count" aria-hidden="true">
                {heartCount}
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
          {isOpen ? <PoemHeartTotal count={totalHearts} /> : null}
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
