"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CommentBubbles } from "@/components/CommentBubbles";
import { EasterEgg } from "@/components/EasterEgg";
import { HitCounter } from "@/components/HitCounter";
import { MobileMenu } from "@/components/MobileMenu";
import { pickPoemIndex, poemMeasureLines, type Poem } from "@/lib/poems";

type MobileReadingProps = {
  poems: Poem[];
  initialIndex: number;
};

const FONT_BOOST_MAX = 4;
const FONT_BOOST_FACTOR = 1.16;
const FONT_FIT_MIN = 11;
const FONT_FIT_MAX = 17;

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <span className={`mobile-chevron${up ? " is-up" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M6 9.5 12 15.5 18 9.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  );
}

type HintProps = {
  up?: boolean;
  label?: string;
  onPaper?: boolean;
  onClick: () => void;
  ariaLabel: string;
};

function ScrollHint({ up, label, onPaper, onClick, ariaLabel }: HintProps) {
  return (
    <button
      type="button"
      className={`mobile-scroll-hint${up ? " is-up" : ""}${onPaper ? " is-on-paper" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {label ? <span className="mobile-hint-label">{label}</span> : null}
      <Chevron up={up} />
    </button>
  );
}

function fitPoemFont(copy: HTMLElement, poem: Poem) {
  const body = copy.querySelector(".poem-body");
  const title = copy.querySelector(".poem-title");
  const styles = getComputedStyle(copy);
  const available =
    copy.clientWidth -
    Number.parseFloat(styles.paddingLeft) -
    Number.parseFloat(styles.paddingRight) -
    8;
  const titleInset = title
    ? Number.parseFloat(getComputedStyle(title).paddingRight) || 0
    : 0;
  const family = getComputedStyle(body ?? copy).fontFamily;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || available <= 0) {
    return FONT_FIT_MIN;
  }

  const lines = poemMeasureLines(poem);

  function fits(size: number) {
    return lines.every((line) => {
      ctx!.font = `${line.weight} ${size * line.scale}px ${family}`;
      const limit = line.weight === 700 ? available - titleInset : available;
      return ctx!.measureText(line.text).width <= limit;
    });
  }

  let lo = FONT_FIT_MIN;
  let hi = FONT_FIT_MAX;
  if (!fits(lo)) {
    return lo;
  }
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export function MobileReading({ poems, initialIndex }: MobileReadingProps) {
  const scrollerRef = useRef<HTMLElement>(null);
  const poemCopyRef = useRef<HTMLElement>(null);
  const [poemIndex, setPoemIndex] = useState(initialIndex);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [fontBoost, setFontBoost] = useState(0);
  const [fitPx, setFitPx] = useState<number | null>(null);
  const poem = poems[poemIndex];

  useLayoutEffect(() => {
    const copy = poemCopyRef.current;
    if (!copy || !poem) {
      return;
    }

    let cancelled = false;

    function measure() {
      if (!copy || cancelled) {
        return;
      }
      setFitPx(fitPoemFont(copy, poem));
    }

    measure();
    void document.fonts.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [poem]);

  function scrollToPanel(index: number) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    scroller.scrollTo({
      top: index * scroller.clientHeight,
      behavior: "smooth",
    });
  }

  function turnPage() {
    setPoemIndex((current) => pickPoemIndex(poems.length, current));
  }

  return (
    <div className="mobile-shell">
      <MobileMenu />

      <button
        type="button"
        className="mobile-comments-fab"
        aria-label="Open guestbook"
        aria-expanded={commentsOpen}
        aria-controls="mobile-comments-panel"
        onClick={() => setCommentsOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            className="mobile-comments-bubble"
            d="M12 2.7c4.85 0 8.8 3.55 8.8 7.95 0 4.4-3.95 7.95-8.8 7.95-1.12 0-2.18-.19-3.16-.54L4.7 20.8l1.05-3.4C4.4 15.9 3.2 13.85 3.2 10.65 3.2 6.25 7.15 2.7 12 2.7Z"
          />
          <circle className="mobile-comments-dot" cx="8.35" cy="10.55" r="1.2" />
          <circle className="mobile-comments-dot" cx="12" cy="10.55" r="1.2" />
          <circle className="mobile-comments-dot" cx="15.65" cy="10.55" r="1.2" />
        </svg>
      </button>

      <div
        id="mobile-comments-panel"
        className={`mobile-comments${commentsOpen ? " is-open" : ""}`}
        aria-hidden={!commentsOpen}
      >
        <div className="mobile-comments-bar">
          <h2 className="mobile-comments-title">guestbook</h2>
          <button
            type="button"
            className="mobile-comments-close"
            aria-label="Close guestbook"
            onClick={() => setCommentsOpen(false)}
          >
            <span className="mobile-comments-close-ribbon" aria-hidden="true">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                <path d="M1.5,0 V30.5 Q1.5,38.5 9.5,38.5 H90.5 Q98.5,38.5 98.5,30.5 V0" />
              </svg>
            </span>
            <span className="mobile-comments-close-label">close</span>
          </button>
        </div>
        <CommentBubbles showHits={false} idPrefix="mobile-" />
      </div>

      <main
        ref={scrollerRef}
        className="mobile-reading"
        aria-label="Original Poetry"
      >
      <section className="mobile-panel mobile-cover" aria-label="Book cover">
        <div className="cover-front">
          <div className="cover-copy">
            <h1 className="cover-title">ORIGINAL POETRY</h1>
            <p className="cover-author">by Beck Chan</p>
            <HitCounter />
          </div>
        </div>
        <ScrollHint
          label="Open Book"
          ariaLabel="Open Book"
          onClick={() => scrollToPanel(1)}
        />
      </section>

      <section className="mobile-panel mobile-leaf" aria-label="Inside cover">
        <ScrollHint
          up
          onPaper
          ariaLabel="Back to the cover"
          onClick={() => scrollToPanel(0)}
        />
        <div className="leaf leaf-left">
          <EasterEgg />
        </div>
        <ScrollHint
          label="Turn Page"
          onPaper
          ariaLabel="Turn Page"
          onClick={() => scrollToPanel(2)}
        />
      </section>

      <section className="mobile-panel mobile-leaf mobile-poem" aria-label="Poem">
        <ScrollHint
          up
          onPaper
          ariaLabel="Back to the inside cover"
          onClick={() => scrollToPanel(1)}
        />
        <div className="leaf">
          {poem ? (
            <article
              className={`leaf-copy${fontBoost > 0 ? " is-font-boosted" : ""}`}
              key={poem.id}
              ref={poemCopyRef}
              style={
                fitPx
                  ? {
                      ["--poem-size" as string]: `${fitPx * FONT_BOOST_FACTOR ** fontBoost}px`,
                    }
                  : undefined
              }
            >
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
        </div>
        <div className="mobile-font-zoom">
          <button
            type="button"
            className="mobile-font-zoom-btn"
            aria-label="Increase font size"
            disabled={fontBoost >= FONT_BOOST_MAX}
            onClick={() =>
              setFontBoost((current) => Math.min(FONT_BOOST_MAX, current + 1))
            }
          >
            +
          </button>
          <span className="mobile-font-zoom-label">font</span>
          <button
            type="button"
            className="mobile-font-zoom-btn"
            aria-label="Decrease font size"
            disabled={fontBoost <= 0}
            onClick={() => setFontBoost((current) => Math.max(0, current - 1))}
          >
            −
          </button>
        </div>
        <ScrollHint
          label="Turn Page"
          onPaper
          ariaLabel="Turn Page"
          onClick={turnPage}
        />
      </section>
    </main>
    </div>
  );
}
