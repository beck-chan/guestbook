"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  getPoemHeartState,
  loadPoemHearts,
  togglePoemHeart,
  type PoemHeartState,
} from "@/lib/actions/hearts";
import { Book } from "@/components/_desk/Book";
import { CommentBubbles } from "@/components/_shared/CommentBubbles";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";
import { MobileReading } from "@/components/_desk/MobileReading";
import { ReportIssueLink } from "@/components/_shared/ReportIssueLink";
import { pickPoemIndex, type Poem } from "@/lib/poems";

type PoetryDeskProps = {
  poems: Poem[];
  initialIndex: number;
};

const EMPTY_HEART: PoemHeartState = {
  liked: false,
  heart_count: 0,
  total_hearts: 0,
};

export function PoetryDesk({ poems, initialIndex }: PoetryDeskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [poemIndex, setPoemIndex] = useState(initialIndex);
  const [hintVisible, setHintVisible] = useState(true);
  const [heart, setHeart] = useState<PoemHeartState>(EMPTY_HEART);
  const [heartPending, startHeartTransition] = useTransition();
  const hintClickedRef = useRef(false);

  const poem = poems[poemIndex];

  useEffect(() => {
    function syncHint() {
      const nearTop = window.scrollY < 80;
      if (!nearTop) {
        hintClickedRef.current = false;
        setHintVisible(false);
        return;
      }
      if (hintClickedRef.current) {
        setHintVisible(false);
        return;
      }
      setHintVisible(true);
    }

    syncHint();
    window.addEventListener("scroll", syncHint, { passive: true });
    return () => window.removeEventListener("scroll", syncHint);
  }, []);

  useEffect(() => {
    if (!poem) {
      setHeart(EMPTY_HEART);
      return;
    }
    let cancelled = false;
    startHeartTransition(async () => {
      const next = await getPoemHeartState(poem.id);
      if (!cancelled) {
        setHeart(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [poem?.id]);

  function onToggleHeart() {
    if (!poem) {
      return;
    }
    startHeartTransition(async () => {
      const next = await togglePoemHeart(poem.id);
      setHeart(next);
    });
  }

  return (
    <>
      <div className="desk-desktop">
        <DeskBookmarks />
        <ReportIssueLink />
        <div className={`desk-split${isOpen ? " is-open" : ""}`}>
          <div className={`stage${isOpen ? " is-open" : ""}`}>
            <Book
              isOpen={isOpen}
              poem={poem}
              heartCount={heart.heart_count}
              liked={heart.liked}
              heartPending={heartPending}
              onToggleHeart={onToggleHeart}
              onTurnPage={() =>
                setPoemIndex((current) => pickPoemIndex(poems.length, current))
              }
              onToggle={() => setIsOpen((open) => !open)}
            />
            <button
              type="button"
              className={`desk-guestbook-hint${hintVisible ? "" : " is-hidden"}`}
              aria-label="guestbook"
              aria-hidden={!hintVisible}
              tabIndex={hintVisible ? 0 : -1}
              onClick={() => {
                hintClickedRef.current = true;
                setHintVisible(false);
                document
                  .getElementById("guestbook")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="desk-guestbook-hint-label">guestbook</span>
              <span className="desk-guestbook-hint-chevron" aria-hidden="true">
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
            </button>
          </div>
          <CommentBubbles sectionId="guestbook" limit={4} />
        </div>
      </div>
      <MobileReading
        poems={poems}
        initialIndex={initialIndex}
        poemIndex={poemIndex}
        onPoemIndexChange={setPoemIndex}
        heartCount={heart.heart_count}
        liked={heart.liked}
        heartPending={heartPending}
        onToggleHeart={onToggleHeart}
      />
    </>
  );
}
