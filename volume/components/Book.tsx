import type { Poem } from "@/lib/poems";
import { StickyNote } from "@/components/StickyNote";

type BookProps = {
  isOpen: boolean;
  poem?: Poem;
  onTurnPage: () => void;
  onToggle: () => void;
};

const EASTER_EGG = {
  heading: "Congrats!",
  paragraphs: [
    "You found the silly little Easter egg.",
    "I am a human that hates talking about myself, which you wouldn’t believe if you managed to corner me into an interview.",
    "The best I can do is some original poetry, some of which may or may not be autobiographical.",
    "Turn the page to receive a slightly-randomized one, y’know, in honour of the ephemeral. No, I will not be taking any feedback, thank you very kindly.",
  ],
};

function EasterEgg() {
  return (
    <div className="leaf-copy">
      <p className="easter-heading">{EASTER_EGG.heading}</p>
      {EASTER_EGG.paragraphs.map((paragraph) => (
        <p key={paragraph} className="easter-body">
          {paragraph}
        </p>
      ))}
      <a
        className="portfolio-link"
        href="https://beck-chan.github.io/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Beck&apos;s Portfolio
      </a>
    </div>
  );
}

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
        <div className="spine" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <StickyNote isOpen={isOpen} onToggle={onToggle} />
      </div>
    </div>
  );
}
