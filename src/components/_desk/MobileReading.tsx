"use client";

import { useRef, useState } from "react";
import { CommentBubbles } from "@/components/_shared/CommentBubbles";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { EasterEgg } from "@/components/_desk/EasterEgg";
import { HitCounter } from "@/components/_shared/HitCounter";
import { MobileMenu } from "@/components/_shared/MobileMenu";
import type { GuestbookComment } from "@/lib/comments";
import { PoemSection } from "@/components/_desk/PoemBody";
import { pickPoemIndex, type Poem } from "@/lib/poems";

type MobileReadingProps = {
  poems: Poem[];
  initialIndex: number;
  hitCount: number;
  hitCountError?: boolean;
  heartCount?: number;
  liked?: boolean;
  onToggleHeart?: () => void;
  heartPending?: boolean;
  poemIndex?: number;
  onPoemIndexChange?: (index: number) => void;
  initialComments: GuestbookComment[];
  initialPage: number;
  initialTotalPages: number;
  commentPageSize: number;
};

const FONT_BOOST_MAX = 4;
const FONT_BOOST_FACTOR = 1.16;
const POEM_FONT_REM = 0.86;

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

export function MobileReading({
  poems,
  initialIndex,
  hitCount,
  hitCountError = false,
  heartCount = 0,
  liked = false,
  onToggleHeart,
  heartPending = false,
  poemIndex: controlledIndex,
  onPoemIndexChange,
  initialComments,
  initialPage,
  initialTotalPages,
  commentPageSize,
}: MobileReadingProps) {
  const scrollerRef = useRef<HTMLElement>(null);
  const [uncontrolledIndex, setUncontrolledIndex] = useState(initialIndex);
  const poemIndex = controlledIndex ?? uncontrolledIndex;
  const setPoemIndex = (updater: number | ((current: number) => number)) => {
    const next =
      typeof updater === "function" ? updater(poemIndex) : updater;
    if (onPoemIndexChange) {
      onPoemIndexChange(next);
    } else {
      setUncontrolledIndex(next);
    }
  };
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [fontBoost, setFontBoost] = useState(0);
  const poem = poems[poemIndex];
  const poemSize = `${POEM_FONT_REM * FONT_BOOST_FACTOR ** fontBoost}rem`;

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
        <CommentBubbles
          showHits={false}
          idPrefix="mobile-"
          limit={commentPageSize}
          initialComments={initialComments}
          initialPage={initialPage}
          initialTotalPages={initialTotalPages}
        />
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
            <HitCounter count={hitCount} error={hitCountError} />
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
          ariaLabel="Close Book"
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
              className="leaf-copy"
              key={poem.id}
              style={{ ["--poem-size" as string]: poemSize }}
            >
              {poem.sections.map((section) => (
                <PoemSection
                  key={section.title}
                  title={section.title}
                  html={section.html}
                />
              ))}
            </article>
          ) : null}
          <div className="poem-heart-stack">
            <button
              type="button"
              className="poem-heart"
              title="Like This Poem"
              aria-label={`Like This Poem, ${heartCount} likes`}
              aria-pressed={liked}
              disabled={heartPending || !poem}
              onClick={onToggleHeart}
            >
              <DocsHeart filled={liked} className="poem-heart-icon" />
            </button>
            <span className="poem-heart-count" aria-hidden="true">
              {heartCount}
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
