"use client";

import { useEffect, useRef, useState } from "react";
import { Book } from "@/components/Book";
import { CommentBubbles } from "@/components/CommentBubbles";
import { DeskBookmarks } from "@/components/DeskBookmarks";
import { MobileReading } from "@/components/MobileReading";
import { ReportIssueLink } from "@/components/ReportIssueLink";
import { pickPoemIndex, type Poem } from "@/lib/poems";

type PoetryDeskProps = {
  poems: Poem[];
  initialIndex: number;
};

export function PoetryDesk({ poems, initialIndex }: PoetryDeskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [poemIndex, setPoemIndex] = useState(initialIndex);
  const [hintVisible, setHintVisible] = useState(true);
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
          <CommentBubbles sectionId="guestbook" />
        </div>
      </div>
      <MobileReading poems={poems} initialIndex={initialIndex} />
    </>
  );
}
