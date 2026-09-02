"use client";

import { useEffect, useRef, useState } from "react";
import { Book } from "@/components/Book";
import { CommentBubbles } from "@/components/CommentBubbles";
import { MobileReading } from "@/components/MobileReading";
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
      <div className={`desk-split desk-desktop${isOpen ? " is-open" : ""}`}>
        <div className={`stage${isOpen ? " is-open" : ""}`}>
          <div className="desk-bookmarks">
            <a
              className="desk-bookmark desk-bookmark-labeled"
              href="/docs"
              aria-label="view docs"
            >
              <span className="desk-bookmark-ribbon" aria-hidden="true" />
              <span className="desk-bookmark-label">
                view
                <br />
                docs
              </span>
            </a>
            <a
              className="desk-bookmark desk-bookmark-short desk-bookmark-admin"
              href="/admin"
              aria-label="admin login"
            >
              <span className="desk-bookmark-ribbon" aria-hidden="true">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline points="98.5,0 98.5,98.5 50,77 1.5,98.5 1.5,0" />
                </svg>
              </span>
              <span className="desk-bookmark-label">admin login</span>
            </a>
          </div>
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
      <MobileReading poems={poems} initialIndex={initialIndex} />
    </>
  );
}
