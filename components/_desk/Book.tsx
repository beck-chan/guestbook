"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Poem } from "@/lib/poems";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { EasterEgg } from "@/components/_desk/EasterEgg";
import { StickyNote } from "@/components/_desk/StickyNote";

gsap.registerPlugin(useGSAP);

type BookProps = {
  isOpen: boolean;
  poem?: Poem;
  onTurnPage: () => void;
  onToggle: () => void;
  heartCount?: number;
  liked?: boolean;
  onToggleHeart?: () => void;
  heartPending?: boolean;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function openSceneWidth(scene: HTMLElement, leaf: number) {
  const stage = scene.closest(".stage");
  if (!(stage instanceof HTMLElement)) {
    return leaf * 2;
  }
  const raw = getComputedStyle(stage).getPropertyValue("--book-width");
  const percent = Number.parseFloat(raw) || 90;
  return Math.min(stage.clientWidth * (percent / 100), leaf * 2);
}

function measureLeaf(scene: HTMLElement, isOpen: boolean) {
  if (!isOpen) {
    return scene.offsetWidth;
  }
  return scene.offsetWidth / 2;
}

type BookPoses = {
  hoverX: number;
  hoverY: number;
  landX: number;
  arcY: number;
  openW: number;
};

function measurePoses(
  scene: HTMLElement,
  note: HTMLElement,
  leaf: number,
): BookPoses {
  const sticky = note.offsetWidth;
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const openW = openSceneWidth(scene, leaf);
  return {
    hoverX: sticky * 0.77,
    hoverY: -0.65 * rem,
    landX: -openW - sticky * (2 / 3) + sticky * 0.55,
    arcY: -sticky * 0.55,
    openW,
  };
}

function sceneWidthForCover(
  rotationY: number,
  closing: boolean,
  leaf: number,
  openW: number,
) {
  if (closing) {
    if (rotationY <= -90) {
      return openW;
    }
    return leaf + (openW - leaf) * (rotationY / -90);
  }
  if (rotationY > -90) {
    return leaf;
  }
  return leaf + (openW - leaf) * ((rotationY + 90) / -90);
}

function spreadWidthForCover(
  sceneW: number,
  leaf: number,
  openW: number,
) {
  if (sceneW <= leaf) {
    return leaf * 2;
  }
  const span = openW - leaf;
  if (span <= 0) {
    return openW;
  }
  const t = (sceneW - leaf) / span;
  return leaf * 2 + (openW - leaf * 2) * t;
}

function buildTimeline(
  scene: HTMLElement,
  book: HTMLElement,
  spread: HTMLElement,
  cover: HTMLElement,
  note: HTMLElement,
  pageLeft: HTMLElement,
  gutter: HTMLElement,
  leaf: number,
  poses: BookPoses,
) {
  const { hoverX, hoverY, landX, arcY, openW } = poses;

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.inOut" },
  });

  gsap.set(gutter, { opacity: 0 });

  tl.fromTo(
    note,
    { x: 0, y: 0, rotation: -90, z: 0, zIndex: 2 },
    {
      x: hoverX,
      y: hoverY,
      rotation: -12,
      z: 90,
      zIndex: 8,
      force3D: true,
      duration: 0.48,
      ease: "power2.out",
      immediateRender: false,
    },
    0,
  );

  tl.fromTo(
    cover,
    { rotationY: 0, z: 3 },
    {
      rotationY: -180,
      z: 3,
      duration: 1.2,
      ease: "power2.inOut",
      immediateRender: false,
    },
    0.18,
  );

  tl.to(cover, { z: 36, duration: 0.4, ease: "power2.out" }, 0.18);
  tl.to(cover, { z: 3, duration: 0.56, ease: "power2.in" }, 0.72);

  let revealed = false;
  let stacked = false;
  tl.eventCallback("onUpdate", () => {
    const rotationY = Number(gsap.getProperty(cover, "rotationY"));
    const closing = tl.reversed();
    const nextReveal = rotationY <= -90;
    const nextStack = nextReveal;
    if (nextReveal !== revealed) {
      revealed = nextReveal;
      pageLeft.classList.toggle("is-revealed", nextReveal);
    }
    if (nextStack !== stacked) {
      stacked = nextStack;
      book.classList.toggle("is-stacked", nextStack);
    }
    const sceneW = sceneWidthForCover(rotationY, closing, leaf, openW);
    gsap.set(scene, { width: sceneW });
    spread.style.width = `${spreadWidthForCover(sceneW, leaf, openW)}px`;
  });

  tl.to(gutter, { opacity: 1, duration: 0.55, ease: "power1.out" }, 1.32);

  tl.to(
    note,
    {
      x: landX,
      rotation: -6,
      duration: 1.05,
      ease: "power1.inOut",
    },
    1.4,
  );
  tl.to(note, { y: arcY, duration: 0.42, ease: "power2.out" }, 1.4);
  tl.to(note, { y: 0, duration: 0.63, ease: "power2.inOut" }, 1.82);

  return tl;
}

export function Book({
  isOpen,
  poem,
  onTurnPage,
  onToggle,
  heartCount = 0,
  liked = false,
  onToggleHeart,
  heartPending = false,
}: BookProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLButtonElement>(null);
  const pageLeftRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef(0);
  const posesRef = useRef<BookPoses | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const prevOpenRef = useRef<boolean | null>(null);
  const isOpenRef = useRef(isOpen);
  const resizeDirtyRef = useRef(false);
  isOpenRef.current = isOpen;

  function clearMotionProps() {
    const scene = sceneRef.current;
    const cover = coverRef.current;
    const note = noteRef.current;
    if (scene) {
      gsap.set(scene, { clearProps: "width" });
    }
    if (spreadRef.current) {
      gsap.set(spreadRef.current, { clearProps: "width" });
    }
    if (cover) {
      gsap.set(cover, { clearProps: "transform,z" });
    }
    if (note) {
      gsap.set(note, { clearProps: "transform,x,y,z,zIndex" });
    }
    if (gutterRef.current) {
      gsap.set(gutterRef.current, { clearProps: "opacity" });
    }
  }

  function unpinSpread() {
    if (spreadRef.current) {
      spreadRef.current.style.width = "";
    }
  }

  function pinSpread(leaf: number) {
    if (spreadRef.current) {
      spreadRef.current.style.width = `${leaf * 2}px`;
    }
  }

  function settleOpen() {
    bookRef.current?.classList.remove("is-animating");
    bookRef.current?.classList.add("is-stacked");
    pageLeftRef.current?.classList.add("is-revealed");
    clearMotionProps();
    unpinSpread();
    if (resizeDirtyRef.current) {
      resizeDirtyRef.current = false;
      rebuildTimeline();
    }
  }

  function settleClosed() {
    bookRef.current?.classList.remove("is-animating", "is-stacked");
    pageLeftRef.current?.classList.remove("is-revealed");
    clearMotionProps();
    unpinSpread();
    if (resizeDirtyRef.current) {
      resizeDirtyRef.current = false;
      rebuildTimeline();
    }
  }

  function rebuildTimeline() {
    const scene = sceneRef.current;
    const book = bookRef.current;
    const spread = spreadRef.current;
    const cover = coverRef.current;
    const note = noteRef.current;
    const pageLeft = pageLeftRef.current;
    const gutter = gutterRef.current;
    if (!scene || !book || !spread || !cover || !note || !pageLeft || !gutter) {
      return;
    }

    const open = isOpenRef.current;
    const leaf = measureLeaf(scene, open);
    leafRef.current = leaf;
    const poses = measurePoses(scene, note, leaf);
    posesRef.current = poses;
    unpinSpread();

    tlRef.current?.kill();
    if (prefersReducedMotion()) {
      tlRef.current = null;
      return;
    }

    const tl = buildTimeline(
      scene,
      book,
      spread,
      cover,
      note,
      pageLeft,
      gutter,
      leaf,
      poses,
    );
    tl.eventCallback("onComplete", settleOpen);
    tl.eventCallback("onReverseComplete", settleClosed);
    tlRef.current = tl;

    if (open) {
      tl.progress(1).pause();
      book.classList.add("is-stacked");
      pageLeft.classList.add("is-revealed");
    } else {
      tl.progress(0).pause();
      book.classList.remove("is-stacked");
      pageLeft.classList.remove("is-revealed");
    }
  }

  useGSAP(
    () => {
      rebuildTimeline();
      return () => {
        tlRef.current?.kill();
        tlRef.current = null;
      };
    },
    { scope: sceneRef, dependencies: [] },
  );

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const stage = scene?.closest(".stage");
    if (!(stage instanceof HTMLElement)) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (bookRef.current?.classList.contains("is-animating")) {
        resizeDirtyRef.current = true;
        return;
      }
      rebuildTimeline();
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (prevOpenRef.current === null) {
      prevOpenRef.current = isOpen;
      return;
    }
    if (prevOpenRef.current === isOpen) {
      return;
    }
    prevOpenRef.current = isOpen;

    const scene = sceneRef.current;
    const book = bookRef.current;
    const cover = coverRef.current;
    const note = noteRef.current;
    const tl = tlRef.current;
    const leaf = leafRef.current;
    const poses = posesRef.current;

    if (prefersReducedMotion() || !tl || !scene || !book || !cover || !note) {
      if (isOpen) {
        settleOpen();
      } else {
        settleClosed();
      }
      return;
    }

    book.classList.add("is-animating");

    if (isOpen) {
      pinSpread(leaf);
      if (tl.progress() === 0 && poses) {
        gsap.set(scene, { width: leaf });
        gsap.set(cover, {
          rotationY: 0,
          z: 3,
          transformOrigin: "left center",
        });
        gsap.set(note, {
          x: 0,
          y: 0,
          rotation: -90,
          z: 0,
          zIndex: 2,
        });
      }
      tl.play();
    } else {
      if (tl.progress() === 1 && poses) {
        gsap.set(scene, { width: poses.openW });
        if (spreadRef.current) {
          spreadRef.current.style.width = `${poses.openW}px`;
        }
        gsap.set(cover, {
          rotationY: -180,
          z: 3,
          transformOrigin: "left center",
        });
        gsap.set(note, {
          x: poses.landX,
          y: 0,
          rotation: -6,
          z: 90,
          zIndex: 8,
        });
      }
      tl.reverse();
    }
  }, [isOpen]);

  return (
    <div className="book-scene" data-open={isOpen} ref={sceneRef}>
      <div
        ref={bookRef}
        className={`book${isOpen ? " is-open" : ""}`}
      >
        <div className="spread" ref={spreadRef}>
          <div className="spread-gutter" aria-hidden="true" ref={gutterRef} />
          <div className="page-left" aria-hidden="true" ref={pageLeftRef}>
            <div className="leaf leaf-left">
              <EasterEgg />
            </div>
          </div>
          <div className="page-right">
            <div className="leaf">
              {poem ? (
                <article
                  key={poem.id}
                  className="leaf-copy"
                  aria-hidden={!isOpen}
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
          </div>
          <div className="cover" ref={coverRef}>
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
        </div>
        <StickyNote ref={noteRef} isOpen={isOpen} onToggle={onToggle} />
      </div>
    </div>
  );
}
