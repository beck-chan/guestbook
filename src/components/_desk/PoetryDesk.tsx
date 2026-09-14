"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  getDeskHeartSeed,
  getPoemHeartState,
  togglePoemHeart,
  type PoemHeartState,
} from "@/lib/actions/hearts";
import { Book } from "@/components/_desk/Book";
import { CommentBubbles } from "@/components/_shared/CommentBubbles";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";
import { MobileReading } from "@/components/_desk/MobileReading";
import { ReportIssueLink } from "@/components/_shared/ReportIssueLink";
import type { GuestbookComment } from "@/lib/comments";
import { pickPoemIndex, type Poem } from "@/lib/poems";

type PoetryDeskProps = {
  poems: Poem[];
  initialIndex: number;
  hitCount: number;
  initialComments: GuestbookComment[];
  initialPage: number;
  initialTotalPages: number;
  commentPageSize: number;
};

const EMPTY_HEART: PoemHeartState = {
  liked: false,
  heart_count: 0,
  total_hearts: 0,
};

function seedHeartCache(
  poemIds: string[],
  heartCounts: Record<string, number>,
  totalHearts: number,
  initialPoemId?: string,
  initialHeart?: PoemHeartState,
) {
  const cache: Record<string, PoemHeartState> = {};
  for (const id of poemIds) {
    cache[id] = {
      ...EMPTY_HEART,
      heart_count: heartCounts[id] ?? 0,
      total_hearts: totalHearts,
    };
  }
  if (initialPoemId && initialHeart) {
    cache[initialPoemId] = initialHeart;
  }
  return cache;
}

export function PoetryDesk({
  poems,
  initialIndex,
  hitCount,
  initialComments,
  initialPage,
  initialTotalPages,
  commentPageSize,
}: PoetryDeskProps) {
  const initialPoemId = poems[initialIndex]?.id;
  const resolvedRef = useRef(new Set<string>());
  const ignoreFetchRef = useRef(new Set<string>());

  const [isOpen, setIsOpen] = useState(false);
  const [poemIndex, setPoemIndex] = useState(initialIndex);
  const [hintVisible, setHintVisible] = useState(true);
  const [heartCache, setHeartCache] = useState<Record<string, PoemHeartState>>(
    () =>
      seedHeartCache(
        poems.map((item) => item.id),
        {},
        0,
      ),
  );
  const [heartPending, startHeartTransition] = useTransition();
  const [heartsReady, setHeartsReady] = useState(false);
  const hintClickedRef = useRef(false);

  const poem = poems[poemIndex];
  const poemId = poem?.id;
  const cachedHeart = poemId ? heartCache[poemId] : undefined;
  const maxTotalHearts = Object.values(heartCache).reduce(
    (max, item) => Math.max(max, item.total_hearts),
    cachedHeart?.total_hearts ?? 0,
  );
  const heart = cachedHeart
    ? {
        ...cachedHeart,
        total_hearts: Math.max(cachedHeart.total_hearts, maxTotalHearts),
      }
    : {
        ...EMPTY_HEART,
        total_hearts: maxTotalHearts,
      };

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
    let cancelled = false;

    void getDeskHeartSeed(initialPoemId ?? "").then((seed) => {
      if (cancelled) {
        return;
      }

      setHeartCache((current) => {
        const nextCache = seedHeartCache(
          poems.map((item) => item.id),
          seed.heartCounts,
          seed.initialHeart.total_hearts,
          initialPoemId,
          seed.initialHeart,
        );
        for (const id of resolvedRef.current) {
          const kept = current[id];
          if (kept) {
            nextCache[id] = kept;
          }
        }
        return nextCache;
      });
      if (initialPoemId) {
        resolvedRef.current.add(initialPoemId);
      }
      setHeartsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialPoemId, poems]);

  useEffect(() => {
    if (!heartsReady || !poemId) {
      return;
    }

    if (resolvedRef.current.has(poemId)) {
      return;
    }

    let cancelled = false;
    void getPoemHeartState(poemId).then((next) => {
      if (cancelled || ignoreFetchRef.current.has(poemId)) {
        return;
      }
      setHeartCache((current) => ({ ...current, [poemId]: next }));
      resolvedRef.current.add(poemId);
    });
    return () => {
      cancelled = true;
    };
  }, [heartsReady, poemId]);

  function onToggleHeart() {
    if (!poem) {
      return;
    }
    ignoreFetchRef.current.add(poem.id);
    startHeartTransition(async () => {
      const next = await togglePoemHeart(poem.id);
      setHeartCache((current) => ({ ...current, [poem.id]: next }));
      resolvedRef.current.add(poem.id);
    });
  }

  return (
    <div className="page-enter">
      <div className="desk-desktop">
        <DeskBookmarks />
        <ReportIssueLink />
        <div className={`desk-split${isOpen ? " is-open" : ""}`}>
          <div
            className={`stage${isOpen ? " is-open" : ""}${hintVisible ? " has-guestbook-hint" : ""}`}
          >
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
          <CommentBubbles
            sectionId="guestbook"
            limit={commentPageSize}
            hitCount={hitCount}
            initialComments={initialComments}
            initialPage={initialPage}
            initialTotalPages={initialTotalPages}
          />
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
        hitCount={hitCount}
        initialComments={initialComments}
        initialPage={initialPage}
        initialTotalPages={initialTotalPages}
        commentPageSize={commentPageSize}
      />
    </div>
  );
}
