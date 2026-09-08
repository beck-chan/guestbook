"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Poem } from "@/lib/poems";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { EasterEgg } from "@/components/_desk/EasterEgg";
import { StickyNote } from "@/components/_desk/StickyNote";

gsap.registerPlugin(useGSAP);

const AJAR = -20;
const STACK_CLIP_CLOSED = "inset(-12px 0px -12px 0px)";
const STACK_CLIP_OPEN = "inset(-12px 0px -12px -28px)";

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

function stageInnerWidth(stage: HTMLElement) {
  const styles = getComputedStyle(stage);
  return (
    stage.clientWidth -
    Number.parseFloat(styles.paddingLeft) -
    Number.parseFloat(styles.paddingRight)
  );
}

function measureStageToken(stage: HTMLElement, widthValue: string) {
  const box = document.createElement("div");
  box.style.cssText = `position:absolute;left:0;top:0;width:${stageInnerWidth(stage)}px;height:0;overflow:hidden;visibility:hidden;pointer-events:none`;
  const probe = document.createElement("div");
  probe.style.width = widthValue;
  box.appendChild(probe);
  stage.appendChild(box);
  const width = probe.offsetWidth;
  box.remove();
  return width;
}

function measureLeaf(scene: HTMLElement) {
  const stage = scene.closest(".stage");
  if (!(stage instanceof HTMLElement)) {
    return scene.offsetWidth;
  }
  return measureStageToken(stage, "var(--page-side)") || scene.offsetWidth;
}

function openSceneWidth(scene: HTMLElement, leaf: number) {
  const stage = scene.closest(".stage");
  if (!(stage instanceof HTMLElement)) {
    return leaf * 2;
  }
  return (
    measureStageToken(
      stage,
      "min(var(--book-width), calc(var(--page-side) * 2))",
    ) || leaf * 2
  );
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

function spreadWidthForCover(sceneW: number, leaf: number, openW: number) {
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
  const shadowLeftRef = useRef<HTMLDivElement>(null);
  const shadowDepthRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef(0);
  const posesRef = useRef<BookPoses | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const prevOpenRef = useRef<boolean | null>(null);
  const isOpenRef = useRef(isOpen);
  const [heldOpen, setHeldOpen] = useState(false);
  isOpenRef.current = isOpen;

  function nodes() {
    const scene = sceneRef.current;
    const book = bookRef.current;
    const spread = spreadRef.current;
    const cover = coverRef.current;
    const note = noteRef.current;
    const pageLeft = pageLeftRef.current;
    const gutter = gutterRef.current;
    const shadowLeft = shadowLeftRef.current;
    const shadowDepth = shadowDepthRef.current;
    if (
      !scene ||
      !book ||
      !spread ||
      !cover ||
      !note ||
      !pageLeft ||
      !gutter ||
      !shadowLeft ||
      !shadowDepth
    ) {
      return null;
    }
    return {
      scene,
      book,
      spread,
      cover,
      note,
      pageLeft,
      gutter,
      shadowLeft,
      shadowDepth,
    };
  }

  function clearMotionProps() {
    const parts = nodes();
    if (!parts) {
      return;
    }
    gsap.set(parts.scene, { clearProps: "width" });
    gsap.set(parts.spread, { clearProps: "width" });
    gsap.set(parts.cover, { clearProps: "transform,z" });
    gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
    parts.spread.style.width = "";
  }

  function applyFlipLayout(closing: boolean) {
    const parts = nodes();
    const poses = posesRef.current;
    const leaf = leafRef.current;
    if (!parts || !poses || !leaf) {
      return;
    }
    const { scene, book, spread, cover, pageLeft } = parts;
    const rotationY = Number(gsap.getProperty(cover, "rotationY"));
    const pastMid = rotationY <= -90;
    pageLeft.classList.toggle("is-revealed", closing || pastMid);

    if (closing && !pastMid) {
      gsap.set(scene, { width: leaf });
      spread.style.width = `${leaf * 2}px`;
      book.classList.add("is-closing-clip");
      return;
    }

    book.classList.remove("is-closing-clip");
    if (closing || pastMid) {
      const span = poses.openW - leaf;
      const t = pastMid ? (rotationY + 90) / -90 : 1;
      const sceneW = closing ? poses.openW : leaf + span * Math.max(0, Math.min(1, t));
      gsap.set(scene, { width: sceneW });
      spread.style.width = closing
        ? `${poses.openW}px`
        : `${spreadWidthForCover(sceneW, leaf, poses.openW)}px`;
      return;
    }

    gsap.set(scene, { width: leaf });
    spread.style.width = `${leaf * 2}px`;
  }

  function settleOpen() {
    setHeldOpen(false);
    const parts = nodes();
    parts?.book.classList.remove("is-animating", "is-closing-clip");
    parts?.pageLeft.classList.add("is-revealed");
    if (parts) {
      gsap.set(parts.cover, {
        rotationY: -180,
        z: 3,
        transformOrigin: "left center",
      });
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
    }
  }

  function settleClosed() {
    setHeldOpen(false);
    const parts = nodes();
    parts?.book.classList.remove("is-animating", "is-closing-clip");
    parts?.pageLeft.classList.remove("is-revealed");
    if (parts) {
      gsap.set(parts.gutter, { clearProps: "opacity" });
      gsap.set(parts.shadowLeft, { clearProps: "clipPath" });
      gsap.set(parts.shadowDepth, { clearProps: "opacity" });
    }
    clearMotionProps();
  }

  function killAnim() {
    tlRef.current?.kill();
    tlRef.current = null;
  }

  function measure() {
    const parts = nodes();
    if (!parts) {
      return null;
    }
    const leaf = measureLeaf(parts.scene);
    leafRef.current = leaf;
    const poses = measurePoses(parts.scene, parts.note, leaf);
    posesRef.current = poses;
    return { parts, leaf, poses };
  }

  function playToOpen() {
    const measured = measure();
    const parts = measured?.parts ?? nodes();
    const poses = measured?.poses ?? posesRef.current;
    if (!parts || !poses) {
      return;
    }
    killAnim();
    const { cover, note, gutter, shadowLeft, shadowDepth } = parts;
    const { hoverX, hoverY, landX, arcY } = poses;
    const rotationY = Number(gsap.getProperty(cover, "rotationY")) || 0;
    const noteX = Number(gsap.getProperty(note, "x")) || 0;
    const onRight = noteX > landX * 0.5;

    applyFlipLayout(false);

    const coverDur = 1.18 * Math.max(0.28, Math.abs(rotationY + 180) / 180);
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onUpdate: () => applyFlipLayout(false),
      onComplete: settleOpen,
    });

    if (onRight) {
      tl.to(
        note,
        {
          x: hoverX,
          y: hoverY,
          rotation: -12,
          z: 90,
          zIndex: 8,
          force3D: true,
          duration: 0.46,
          ease: "power2.out",
        },
        0,
      );
    }

    tl.to(
      cover,
      {
        rotationY: -180,
        z: 3,
        duration: coverDur,
        ease: "power2.inOut",
      },
      onRight ? 0.16 : 0,
    );
    tl.to(cover, { z: 36, duration: Math.min(0.4, coverDur * 0.34), ease: "power2.out" }, "<");
    tl.to(cover, { z: 3, duration: Math.min(0.56, coverDur * 0.46), ease: "power2.in" }, ">-0.04");

    const shadowAt = Math.max(0.2, coverDur * 0.42);
    gsap.set(shadowLeft, { clipPath: STACK_CLIP_CLOSED });
    gsap.set(shadowDepth, { opacity: 0 });
    tl.to(gutter, { opacity: 1, duration: 0.72, ease: "power1.out" }, shadowAt);
    tl.to(
      shadowLeft,
      { clipPath: STACK_CLIP_OPEN, duration: 0.95, ease: "power2.out" },
      shadowAt,
    );
    tl.to(shadowDepth, { opacity: 1, duration: 0.9, ease: "power1.out" }, shadowAt);

    tl.to(
      note,
      {
        x: landX,
        rotation: -6,
        duration: 1.02,
        ease: "power1.inOut",
      },
      ">-0.12",
    );
    tl.to(note, { y: arcY, duration: 0.4, ease: "power2.out" }, "<");
    tl.to(note, { y: 0, duration: 0.62, ease: "power2.inOut" }, ">-0.14");

    tlRef.current = tl;
  }

  function playToClose() {
    const measured = measure();
    const parts = measured?.parts ?? nodes();
    const poses = measured?.poses ?? posesRef.current;
    if (!parts || !poses) {
      return;
    }
    killAnim();
    const { cover, note, gutter, shadowLeft, shadowDepth } = parts;
    const { hoverX, hoverY, landX } = poses;
    let rotationY = Number(gsap.getProperty(cover, "rotationY"));
    if (Number.isNaN(rotationY)) {
      rotationY = -180;
    }

    if (Math.abs(Number(gsap.getProperty(note, "x")) || 0) < 2 && rotationY <= -160) {
      gsap.set(note, {
        x: landX,
        y: 0,
        rotation: -6,
        z: 90,
        zIndex: 8,
      });
    }

    applyFlipLayout(true);

    const toAjar = 0.92 * Math.max(0.32, Math.abs(Math.min(rotationY, AJAR) - AJAR) / 160);
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onUpdate: () => applyFlipLayout(true),
      onComplete: settleClosed,
    });

    tl.to(gutter, { opacity: 0, duration: 0.48, ease: "power1.in" }, 0);
    tl.to(
      shadowLeft,
      { clipPath: STACK_CLIP_CLOSED, duration: 0.55, ease: "power2.in" },
      0,
    );
    tl.to(shadowDepth, { opacity: 0, duration: 0.5, ease: "power1.in" }, 0);

    if (rotationY < -90) {
      tl.to(
        cover,
        {
          rotationY: -92,
          z: 22,
          duration: toAjar * 0.58,
          ease: "power2.inOut",
        },
        0,
      );
    }

    tl.to(
      note,
      {
        x: hoverX,
        y: hoverY,
        rotation: -12,
        z: 90,
        zIndex: 8,
        duration: Math.min(0.82, toAjar * 0.8),
        ease: "power1.inOut",
      },
      0,
    );

    tl.to(cover, {
      rotationY: AJAR,
      z: 20,
      duration: 0.46,
      ease: "power2.out",
    });

    tl.to(note, {
      x: 0,
      y: 0,
      rotation: -90,
      z: 0,
      zIndex: 2,
      duration: 0.48,
      ease: "power2.inOut",
    }, "<0.08");

    tl.to(cover, {
      rotationY: AJAR,
      z: 16,
      duration: 0.16,
      ease: "none",
    }, ">-0.18");

    tl.to(cover, {
      rotationY: 0,
      z: 3,
      duration: 0.52,
      ease: "power3.in",
    });

    tlRef.current = tl;
  }

  function syncIdle() {
    const measured = measure();
    if (!measured) {
      return;
    }
    const { parts, poses } = measured;
    gsap.set(parts.cover, {
      rotationY: isOpenRef.current ? -180 : 0,
      z: 3,
      transformOrigin: "left center",
    });
    if (isOpenRef.current) {
      parts.pageLeft.classList.add("is-revealed");
      gsap.set(parts.gutter, { opacity: 1 });
      gsap.set(parts.shadowLeft, { clipPath: STACK_CLIP_OPEN });
      gsap.set(parts.shadowDepth, { opacity: 1 });
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
      parts.spread.style.width = "100%";
    } else {
      parts.pageLeft.classList.remove("is-revealed");
      gsap.set(parts.gutter, { opacity: 0 });
      gsap.set(parts.shadowLeft, { clipPath: STACK_CLIP_CLOSED });
      gsap.set(parts.shadowDepth, { opacity: 0 });
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
      parts.spread.style.width = "";
    }
    gsap.set(parts.scene, { clearProps: "width" });
    void poses;
  }

  useGSAP(
    () => {
      syncIdle();
      return () => {
        killAnim();
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
        return;
      }
      syncIdle();
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

    const parts = nodes();
    if (prefersReducedMotion() || !parts) {
      if (isOpen) {
        settleOpen();
      } else {
        settleClosed();
      }
      return;
    }

    const fromIdle = !parts.book.classList.contains("is-animating");
    const poses = posesRef.current ?? measure()?.poses;
    const leaf = leafRef.current || measureLeaf(parts.scene);
    leafRef.current = leaf;

    setHeldOpen(true);
    parts.book.classList.add("is-open", "is-animating");
    gsap.set(parts.cover, { transformOrigin: "left center" });

    if (isOpen) {
      if (fromIdle) {
        gsap.set(parts.cover, { rotationY: 0, z: 3, transformOrigin: "left center" });
        gsap.set(parts.note, { x: 0, y: 0, rotation: -90, z: 0, zIndex: 2 });
        gsap.set(parts.gutter, { opacity: 0 });
        gsap.set(parts.shadowLeft, { clipPath: STACK_CLIP_CLOSED });
        gsap.set(parts.shadowDepth, { opacity: 0 });
      }
      gsap.set(parts.scene, { width: leaf });
      parts.spread.style.width = `${leaf * 2}px`;
      playToOpen();
    } else {
      if (fromIdle && poses) {
        gsap.set(parts.cover, {
          rotationY: -180,
          z: 3,
          transformOrigin: "left center",
        });
        gsap.set(parts.note, {
          x: poses.landX,
          y: 0,
          rotation: -6,
          z: 90,
          zIndex: 8,
        });
        gsap.set(parts.gutter, { opacity: 1 });
        gsap.set(parts.shadowLeft, { clipPath: STACK_CLIP_OPEN });
        gsap.set(parts.shadowDepth, { opacity: 1 });
      }
      if (poses) {
        gsap.set(parts.scene, { width: poses.openW });
        parts.spread.style.width = `${poses.openW}px`;
      }
      playToClose();
    }
  }, [isOpen]);

  return (
    <div className="book-scene" data-open={isOpen} ref={sceneRef}>
      <div
        ref={bookRef}
        className={`book${isOpen || heldOpen ? " is-open" : ""}${heldOpen ? " is-animating" : ""}`}
      >
        <div className="book-shadow-left" aria-hidden="true" ref={shadowLeftRef} />
        <div className="book-shadow-depth" aria-hidden="true" ref={shadowDepthRef} />
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
