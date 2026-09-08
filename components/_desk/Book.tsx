"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Poem } from "@/lib/poems";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { EasterEgg } from "@/components/_desk/EasterEgg";
import { StickyNote } from "@/components/_desk/StickyNote";

gsap.registerPlugin(useGSAP);

const STACK_DEPTH = 28;
const AJAR = {
  rotationY: -9,
  rotationX: -5.5,
  z: 56,
};

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

function measureLeaf(scene: HTMLElement) {
  const stage = scene.closest(".stage");
  if (!(stage instanceof HTMLElement)) {
    return scene.offsetWidth;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:var(--page-side)";
  stage.appendChild(probe);
  const leaf = probe.offsetWidth;
  probe.remove();
  return leaf || scene.offsetWidth;
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
  const shadowClipRef = useRef<HTMLDivElement>(null);
  const coverFrontRef = useRef<HTMLDivElement>(null);
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
    const shadowClip = shadowClipRef.current;
    const coverFront = coverFrontRef.current;
    if (
      !scene ||
      !book ||
      !spread ||
      !cover ||
      !note ||
      !pageLeft ||
      !gutter ||
      !shadowClip ||
      !coverFront
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
      shadowClip,
      coverFront,
    };
  }

  function clearMotionProps() {
    const parts = nodes();
    if (!parts) {
      return;
    }
    gsap.set(parts.scene, { clearProps: "width" });
    gsap.set(parts.spread, { clearProps: "width" });
    gsap.set(parts.cover, { clearProps: "transform,z,rotationX,rotationY" });
    gsap.set(parts.coverFront, { clearProps: "boxShadow" });
    gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
    gsap.set(parts.shadowClip, { clearProps: "width" });
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
      pageLeft.classList.remove("is-revealed");
      return;
    }
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
      gsap.set(parts.gutter, { clearProps: "opacity" });
      gsap.set(parts.shadowClip, { clearProps: "width" });
    }
    clearMotionProps();
    if (parts) {
      parts.spread.style.width = "100%";
    }
  }

  function settleClosed() {
    setHeldOpen(false);
    const parts = nodes();
    parts?.book.classList.remove("is-animating", "is-closing-clip");
    parts?.pageLeft.classList.remove("is-revealed");
    if (parts) {
      gsap.set(parts.gutter, { clearProps: "opacity" });
      gsap.set(parts.shadowClip, { clearProps: "width" });
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
    const { cover, note, gutter, shadowClip, coverFront } = parts;
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
        rotationX: 0,
        z: 3,
        duration: coverDur,
        ease: "power2.inOut",
      },
      onRight ? 0.16 : 0,
    );
    tl.to(cover, { z: 36, duration: Math.min(0.4, coverDur * 0.34), ease: "power2.out" }, "<");
    tl.to(cover, { z: 3, duration: Math.min(0.56, coverDur * 0.46), ease: "power2.in" }, ">-0.04");
    tl.to(coverFront, { boxShadow: "0 0 0 rgb(0 0 0 / 0)", duration: 0.3 }, 0);

    const shadowAt = Math.max(0.45, coverDur * 0.58);
    tl.to(gutter, { opacity: 1, duration: 1.05, ease: "power2.out" }, shadowAt);
    tl.to(shadowClip, { width: STACK_DEPTH, duration: 1.1, ease: "power2.out" }, shadowAt);

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
    const { cover, note, gutter, shadowClip, coverFront } = parts;
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

    const toAjar = 0.92 * Math.max(0.32, Math.abs(Math.min(rotationY, AJAR.rotationY) - AJAR.rotationY) / 160);
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onUpdate: () => applyFlipLayout(true),
      onComplete: settleClosed,
    });

    tl.to(gutter, { opacity: 0, duration: 0.7, ease: "power2.in" }, 0);
    tl.to(shadowClip, { width: 0, duration: 0.75, ease: "power2.in" }, 0);

    if (rotationY < -90) {
      tl.to(
        cover,
        {
          rotationY: -92,
          rotationX: -2,
          z: 28,
          duration: toAjar * 0.58,
          ease: "power2.inOut",
        },
        0,
      );
    }

    tl.to(
      note,
      {
        x: hoverX * 0.2,
        y: hoverY * 0.35,
        rotation: -36,
        z: 72,
        zIndex: 8,
        duration: Math.min(0.8, toAjar * 0.82),
        ease: "power1.inOut",
      },
      0,
    );

    tl.to(cover, {
      rotationY: AJAR.rotationY,
      rotationX: AJAR.rotationX,
      z: AJAR.z,
      duration: 0.5,
      ease: "power2.out",
      force3D: true,
    });

    tl.to(
      note,
      {
        x: 0,
        y: 0,
        rotation: -90,
        z: 1,
        zIndex: 2,
        duration: 0.46,
        ease: "power2.inOut",
      },
      "<0.04",
    );

    tl.to(
      coverFront,
      {
        boxShadow: "18px 28px 36px rgb(70 50 55 / 0.22)",
        duration: 0.4,
        ease: "power2.out",
      },
      "<",
    );

    tl.to(cover, {
      rotationY: AJAR.rotationY,
      rotationX: AJAR.rotationX,
      z: AJAR.z,
      duration: 0.2,
      ease: "none",
    });

    tl.to(cover, {
      rotationY: 0,
      rotationX: 0,
      z: 3,
      duration: 0.55,
      ease: "power3.in",
    });
    tl.to(
      coverFront,
      {
        boxShadow: "0 0 0 rgb(0 0 0 / 0)",
        duration: 0.35,
        ease: "power2.in",
      },
      "<",
    );

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
      rotationX: 0,
      z: 3,
      transformOrigin: "left center",
    });
    if (isOpenRef.current) {
      parts.pageLeft.classList.add("is-revealed");
      gsap.set(parts.gutter, { opacity: 1 });
      gsap.set(parts.shadowClip, { width: STACK_DEPTH });
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
      parts.spread.style.width = "100%";
    } else {
      parts.pageLeft.classList.remove("is-revealed");
      gsap.set(parts.gutter, { opacity: 0 });
      gsap.set(parts.shadowClip, { width: 0 });
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
    gsap.set(parts.cover, {
      transformOrigin: "left center",
      transformPerspective: 1200,
    });

    if (isOpen) {
      if (fromIdle) {
        gsap.set(parts.cover, { rotationY: 0, z: 3, transformOrigin: "left center" });
        gsap.set(parts.note, { x: 0, y: 0, rotation: -90, z: 0, zIndex: 2 });
        gsap.set(parts.gutter, { opacity: 0 });
        gsap.set(parts.shadowClip, { width: 0 });
      }
      gsap.set(parts.scene, { width: leaf });
      parts.spread.style.width = `${leaf * 2}px`;
      playToOpen();
    } else {
      if (fromIdle && poses) {
        gsap.set(parts.cover, {
          rotationY: -180,
          rotationX: 0,
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
        gsap.set(parts.shadowClip, { width: STACK_DEPTH });
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
        <div className="book-shadow-clip" aria-hidden="true" ref={shadowClipRef}>
          <div className="book-shadow-left" />
        </div>
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
            <div className="cover-front" ref={coverFrontRef}>
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
