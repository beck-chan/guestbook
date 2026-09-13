"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Poem } from "@/lib/poems";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { EasterEgg } from "@/components/_desk/EasterEgg";
import { StickyNote } from "@/components/_desk/StickyNote";

gsap.registerPlugin(useGSAP);

const AJAR = -20;
const STACK_CLIP_CLOSED = "inset(0px 0px 0px 0px)";
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

function noteOpenLabel(note: HTMLElement) {
  return note.querySelector<HTMLElement>(".sticky-note-label-open");
}

function noteCloseLabel(note: HTMLElement) {
  return note.querySelector<HTMLElement>(".sticky-note-label-close");
}

function noteEraser(note: HTMLElement) {
  return note.querySelector<HTMLElement>(".sticky-note-eraser");
}

function noteOpenLetters(note: HTMLElement) {
  return note.querySelectorAll<HTMLElement>(
    ".sticky-note-label-open .sticky-note-letter",
  );
}

function noteCloseLetters(note: HTMLElement) {
  return note.querySelectorAll<HTMLElement>(
    ".sticky-note-label-close .sticky-note-letter",
  );
}

function discardFlyingNotes() {
  document.querySelectorAll(".sticky-note-flying").forEach((el) => el.remove());
}

function wheelDeltaY(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }
  return event.deltaY;
}

function leafCopyUnderPoint(root: HTMLElement, x: number, y: number) {
  const right = root.querySelector<HTMLElement>(".page-right .leaf-copy");
  const left = root.querySelector<HTMLElement>(".page-left .leaf-copy");
  const rightBox = right?.getBoundingClientRect();
  const leftBox = left?.getBoundingClientRect();
  const inRight = Boolean(
    right &&
      rightBox &&
      x >= rightBox.left &&
      x <= rightBox.right &&
      y >= rightBox.top &&
      y <= rightBox.bottom,
  );
  const inLeft = Boolean(
    left &&
      leftBox &&
      x >= leftBox.left &&
      x <= leftBox.right &&
      y >= leftBox.top &&
      y <= leftBox.bottom,
  );
  if (inRight && inLeft && rightBox && leftBox) {
    const rightMid = rightBox.left + rightBox.width / 2;
    const leftMid = leftBox.left + leftBox.width / 2;
    return Math.abs(x - rightMid) <= Math.abs(x - leftMid) ? right : left;
  }
  if (inRight) {
    return right;
  }
  if (inLeft) {
    return left;
  }
  return null;
}

function flyingNoteRotation(note: HTMLElement) {
  const rotation = Number(gsap.getProperty(note, "rotation"));
  if (Number.isFinite(rotation) && Math.abs(rotation) > 1) {
    return rotation;
  }
  return -6;
}

function poseFlyingNote(clone: HTMLElement, note: HTMLElement, extras?: gsap.TweenVars) {
  const bounds = note.getBoundingClientRect();
  const width = note.offsetWidth;
  const height = note.offsetHeight;
  gsap.set(clone, {
    position: "fixed",
    left: bounds.left + bounds.width / 2 - width / 2,
    top: bounds.top + bounds.height / 2 - height / 2,
    width,
    height,
    margin: 0,
    transformOrigin: "center center",
    pointerEvents: "none",
    zIndex: 40,
    ...extras,
  });
}

function spawnFlyingNote(note: HTMLButtonElement, extras?: gsap.TweenVars) {
  const clone = note.cloneNode(true) as HTMLButtonElement;
  clone.classList.add("sticky-note-flying");
  clone.removeAttribute("aria-label");
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;
  clone.disabled = true;
  document.body.appendChild(clone);
  poseFlyingNote(clone, note, {
    x: 0,
    y: 0,
    rotation: flyingNoteRotation(note),
    z: 0,
    autoAlpha: 1,
    boxShadow: window.getComputedStyle(note).boxShadow,
    ...extras,
  });
  return clone;
}

function poseOpenShadows(parts: {
  gutter: HTMLElement;
  shadowLeft: HTMLElement;
  shadowRight: HTMLElement;
  shadowDepth: HTMLElement;
}) {
  gsap.set(parts.gutter, { opacity: 1, force3D: false, clearProps: "transform" });
  gsap.set(parts.shadowLeft, { clipPath: STACK_CLIP_OPEN, force3D: false, clearProps: "transform" });
  gsap.set(parts.shadowRight, { opacity: 1, force3D: false, clearProps: "transform" });
  gsap.set(parts.shadowDepth, { opacity: 1, force3D: false, clearProps: "transform" });
}

function poseClosedShadows(parts: {
  gutter: HTMLElement;
  shadowLeft: HTMLElement;
  shadowRight: HTMLElement;
  shadowDepth: HTMLElement;
}) {
  gsap.set(parts.gutter, { opacity: 0, force3D: false, clearProps: "transform" });
  gsap.set(parts.shadowLeft, { clipPath: STACK_CLIP_CLOSED, force3D: false, clearProps: "transform" });
  gsap.set(parts.shadowRight, { opacity: 0, force3D: false, clearProps: "transform" });
  gsap.set(parts.shadowDepth, { opacity: 0, force3D: false, clearProps: "transform" });
}

function setSpineOpacity(scene: HTMLElement, rotationY: number) {
  const angle = Math.min(180, Math.max(0, Math.abs(rotationY)));
  scene.style.setProperty("--spine", String(Math.sin((angle * Math.PI) / 180)));
}

function clearSpineOpacity(scene: HTMLElement) {
  scene.style.removeProperty("--spine");
}

function restClosedShadows(parts: {
  gutter: HTMLElement;
  shadowLeft: HTMLElement;
  shadowRight: HTMLElement;
  shadowDepth: HTMLElement;
}) {
  gsap.set(parts.gutter, { clearProps: "opacity,transform" });
  gsap.set(parts.shadowLeft, { clearProps: "clipPath,transform" });
  gsap.set(parts.shadowRight, { clearProps: "opacity,transform" });
  gsap.set(parts.shadowDepth, { clearProps: "opacity,transform" });
}

function spawnDepartingNote(note: HTMLButtonElement) {
  const clone = spawnFlyingNote(note);
  clone.classList.add("sticky-note-departing");
  return clone;
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

function bookTilt(open: boolean) {
  const narrow = window.matchMedia("(max-width: 720px)").matches;
  if (open) {
    return { rotationX: 0, rotationY: 0 };
  }
  return narrow ? { rotationX: 4, rotationY: -6 } : { rotationX: 5, rotationY: -9 };
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
  const shadowRightRef = useRef<HTMLDivElement>(null);
  const shadowDepthRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef(0);
  const posesRef = useRef<BookPoses | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const prevOpenRef = useRef<boolean | null>(null);
  const isOpenRef = useRef(isOpen);
  const settleLockRef = useRef(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
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
    const shadowRight = shadowRightRef.current;
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
      !shadowRight ||
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
      shadowRight,
      shadowDepth,
    };
  }

  function clearMotionProps() {
    const parts = nodes();
    if (!parts) {
      return;
    }
    gsap.set(parts.scene, { clearProps: "width,x" });
    gsap.set(parts.spread, { clearProps: "width" });
    gsap.set(parts.book, { clearProps: "transform,rotationX,rotationY" });
    gsap.set(parts.cover, { clearProps: "transform,z,backfaceVisibility" });
    gsap.set(parts.note, {
      clearProps: "transform,x,y,z,zIndex,left,boxShadow,opacity,visibility,pointerEvents",
    });
    parts.spread.style.width = "";
    clearSpineOpacity(parts.scene);
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
    setSpineOpacity(scene, Number.isFinite(rotationY) ? rotationY : 0);
    const pastMid = rotationY <= -90;
    pageLeft.classList.toggle("is-revealed", pastMid);
    const inside = cover.querySelector(".cover-inside");
    if (inside instanceof HTMLElement) {
      gsap.set(inside, { visibility: pastMid ? "visible" : "hidden" });
    }

    if (closing) {
      const span = poses.openW - leaf;
      if (!pastMid) {
        const t = Math.max(0, Math.min(1, (rotationY + 90) / 90));
        gsap.set(scene, { width: leaf, x: (span / 2) * (1 - t) });
        spread.style.width = `${leaf * 2}px`;
        book.setAttribute("data-closing-clip", "");
      } else {
        book.removeAttribute("data-closing-clip");
        gsap.set(scene, { clearProps: "width,x" });
        spread.style.width = "100%";
      }
      return;
    }

    gsap.set(scene, { x: 0 });
    book.removeAttribute("data-closing-clip");
    if (pastMid) {
      const span = poses.openW - leaf;
      const t = (rotationY + 90) / -90;
      const sceneW = leaf + span * Math.max(0, Math.min(1, t));
      gsap.set(scene, { width: sceneW });
      spread.style.width = `${spreadWidthForCover(sceneW, leaf, poses.openW)}px`;
      return;
    }

    gsap.set(scene, { width: leaf });
    spread.style.width = `${leaf * 2}px`;
  }

  function settleOpen() {
    const parts = nodes();
    parts?.book.removeAttribute("data-closing-clip");
    parts?.pageLeft.classList.add("is-revealed");
    if (parts) {
      settleLockRef.current = true;
      gsap.set(parts.scene, {
        width: parts.scene.getBoundingClientRect().width,
        x: 0,
      });
      gsap.set(parts.book, { clearProps: "transform,rotationX,rotationY" });
      gsap.set(parts.cover, {
        rotationY: -180,
        z: 3,
        transformOrigin: "left center",
        clearProps: "backfaceVisibility",
      });
      const coverInside = parts.cover.querySelector(".cover-inside");
      if (coverInside instanceof HTMLElement) {
        gsap.set(coverInside, { clearProps: "visibility" });
      }
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex,left,boxShadow" });
      const openLabel = noteOpenLabel(parts.note);
      const closeLabel = noteCloseLabel(parts.note);
      if (openLabel) {
        gsap.set(openLabel, { clearProps: "clipPath,webkitMaskImage,webkitMaskSize,webkitMaskPosition,maskImage,maskSize,maskPosition,opacity,visibility,overflow" });
      }
      if (closeLabel) {
        gsap.set(closeLabel, { clearProps: "clipPath" });
      }
      const eraser = noteEraser(parts.note);
      if (eraser) {
        gsap.set(eraser, { clearProps: "transform,x,y,rotation,opacity" });
      }
      gsap.set(noteOpenLetters(parts.note), { clearProps: "opacity,y,transform" });
      gsap.set(noteCloseLetters(parts.note), { clearProps: "opacity,y,transform" });
      parts.note.classList.add("is-label-open");
      clearSpineOpacity(parts.scene);
      parts.book.classList.remove("is-animating", "is-closing-clip");
    }
    setAnimating(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        settleLockRef.current = false;
      });
    });
  }

  function settleClosed() {
    const parts = nodes();
    if (parts) {
      parts.book.style.transition = "none";
      parts.book.classList.remove("is-open", "is-animating", "is-closing-clip");
      parts.book.removeAttribute("data-closing-clip");
      gsap.set(parts.book, bookTilt(false));
    }
    setHeldOpen(false);
    setAnimating(false);
    parts?.pageLeft.classList.remove("is-revealed");
    discardFlyingNotes();
    if (parts) {
      restClosedShadows(parts);
      const openLabel = noteOpenLabel(parts.note);
      const closeLabel = noteCloseLabel(parts.note);
      if (openLabel) {
        gsap.set(openLabel, { clearProps: "clipPath,webkitMaskImage,webkitMaskSize,webkitMaskPosition,maskImage,maskSize,maskPosition,opacity,visibility,overflow" });
      }
      if (closeLabel) {
        gsap.set(closeLabel, { clearProps: "clipPath" });
      }
      const eraser = noteEraser(parts.note);
      if (eraser) {
        gsap.set(eraser, { clearProps: "transform,x,y,rotation,opacity" });
      }
      gsap.set(noteOpenLetters(parts.note), { clearProps: "opacity,y,transform" });
      gsap.set(noteCloseLetters(parts.note), { clearProps: "opacity,y,transform" });
      parts.note.classList.remove("is-label-open");
      const coverInside = parts.cover.querySelector(".cover-inside");
      if (coverInside instanceof HTMLElement) {
        gsap.set(coverInside, { clearProps: "visibility" });
      }
    }
    clearMotionProps();
    if (parts) {
      requestAnimationFrame(() => {
        parts.book.style.transition = "";
      });
    }
  }

  function killAnim() {
    tlRef.current?.kill();
    tlRef.current = null;
    discardFlyingNotes();
    const note = noteRef.current;
    if (note) {
      gsap.set(note, { autoAlpha: 1, pointerEvents: "auto" });
    }
  }

  function beginCoverClose() {
    const parts = nodes();
    if (!parts) {
      return;
    }
    const { scene, book, spread } = parts;
    book.style.transition = "none";
    gsap.set(scene, { width: scene.getBoundingClientRect().width });
    if (!spread.style.width) {
      spread.style.width = "100%";
    }
    book.classList.add("is-animating");
    setAnimating(true);
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
    const { book, cover, note, gutter, shadowLeft, shadowRight, shadowDepth } = parts;
    const { hoverX, hoverY, landX, arcY } = poses;
    const rotationY = Number(gsap.getProperty(cover, "rotationY")) || 0;
    const noteX = Number(gsap.getProperty(note, "x")) || 0;
    const onRight = noteX > landX * 0.5;

    gsap.set(book, bookTilt(false));
    applyFlipLayout(false);

    const coverDur = 1.42 * Math.max(0.28, Math.abs(rotationY + 180) / 180);
    const coverStart = onRight ? 0.16 : 0;
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onUpdate: () => applyFlipLayout(false),
      onComplete: settleOpen,
    });
    tl.to(book, { ...bookTilt(true), duration: coverDur, ease: "sine.inOut" }, coverStart);

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
      const openLabel = noteOpenLabel(note);
      const eraser = noteEraser(note);
      if (openLabel && eraser) {
        const width = openLabel.offsetWidth;
        const mask = {
          webkitMaskImage:
            "linear-gradient(90deg, #000 0%, #000 42%, rgb(0 0 0 / 0.2) 52%, transparent 68%)",
          webkitMaskRepeat: "no-repeat",
          webkitMaskSize: "320% 180%",
          maskImage:
            "linear-gradient(90deg, #000 0%, #000 42%, rgb(0 0 0 / 0.2) 52%, transparent 68%)",
          maskRepeat: "no-repeat",
          maskSize: "320% 180%",
        };
        gsap.set(openLabel, {
          ...mask,
          webkitMaskPosition: "0% 40%",
          maskPosition: "0% 40%",
          overflow: "hidden",
          autoAlpha: 1,
        });
        gsap.set(eraser, {
          opacity: 0,
          x: width - 4,
          y: -12,
          rotation: -34,
        });
        tl.to(
          eraser,
          { opacity: 1, y: 3, rotation: -26, duration: 0.12, ease: "power2.out" },
          0.05,
        );
        tl.to(
          eraser,
          { x: width * 0.55, y: 6, duration: 0.14, ease: "power1.inOut" },
          0.12,
        );
        tl.to(
          openLabel,
          { webkitMaskPosition: "42% 55%", maskPosition: "42% 55%", duration: 0.14, ease: "none" },
          0.12,
        );
        tl.to(
          eraser,
          { x: width * 0.7, y: -2, rotation: -16, duration: 0.1, ease: "power1.inOut" },
          0.26,
        );
        tl.to(
          eraser,
          { x: -18, y: 5, rotation: -32, duration: 0.24, ease: "power1.in" },
          0.36,
        );
        tl.to(
          openLabel,
          { webkitMaskPosition: "130% 45%", maskPosition: "130% 45%", duration: 0.26, ease: "power1.out" },
          0.34,
        );
        tl.to(
          openLabel,
          { autoAlpha: 0, duration: 0.08, ease: "power1.out" },
          0.56,
        );
        tl.to(
          eraser,
          { opacity: 0, y: -14, rotation: -6, duration: 0.16, ease: "power2.in" },
          0.58,
        );
      }
    }

    tl.to(
      cover,
      {
        rotationY: -180,
        z: 3,
        duration: coverDur,
        ease: "power2.in",
      },
      coverStart,
    );
    tl.to(cover, { z: 22, duration: Math.min(0.48, coverDur * 0.34), ease: "sine.out" }, "<");
    tl.to(cover, { z: 3, duration: Math.min(0.62, coverDur * 0.46), ease: "sine.in" }, ">-0.04");

    const shadowAt = Math.max(0.2, coverDur * 0.42);
    poseClosedShadows({ gutter, shadowLeft, shadowRight, shadowDepth });
    tl.to(gutter, { opacity: 1, duration: 0.72, ease: "power1.out", force3D: false }, shadowAt);
    tl.to(
      shadowLeft,
      { clipPath: STACK_CLIP_OPEN, duration: 0.95, ease: "power2.out", force3D: false },
      shadowAt,
    );
    tl.to(shadowRight, { opacity: 1, duration: 0.9, ease: "power1.out", force3D: false }, shadowAt);
    tl.to(shadowDepth, { opacity: 1, duration: 0.9, ease: "power1.out", force3D: false }, shadowAt);

    tl.addLabel("noteFly", ">-0.12");
    tl.to(
      note,
      {
        x: landX,
        rotation: -6,
        duration: 1.02,
        ease: "power1.inOut",
      },
      "noteFly",
    );
    tl.to(note, { y: arcY, duration: 0.4, ease: "power2.out" }, "noteFly");
    tl.to(note, { y: 0, duration: 0.62, ease: "power2.inOut" }, "noteFly+=0.26");
    tl.to(
      note,
      {
        z: 40,
        zIndex: 8,
        boxShadow:
          "1px 1px 0 rgb(210 160 165 / 0.4), 5px 10px 18px rgb(40 38 34 / 0.16)",
        duration: 0.34,
        ease: "power2.out",
      },
      "noteFly+=1.02",
    );

    const closeLetters = note.querySelectorAll<HTMLElement>(
      ".sticky-note-label-close .sticky-note-letter",
    );
    if (onRight && closeLetters.length > 0) {
      tl.add(() => {
        note.classList.add("is-label-open");
        gsap.set(closeLetters, { opacity: 0, y: 6 });
      }, "noteFly+=1.36");
      tl.to(
        closeLetters,
        {
          opacity: 1,
          y: 0,
          duration: 0.11,
          stagger: 0.07,
          ease: "power1.out",
        },
        "noteFly+=1.36",
      );
    }

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
    const { book, cover, note, gutter, shadowLeft, shadowRight, shadowDepth } = parts;
    const { hoverX, hoverY } = poses;
    let rotationY = Number(gsap.getProperty(cover, "rotationY"));
    if (Number.isNaN(rotationY) || Math.abs(rotationY) < 2) {
      rotationY = -180;
    }

    gsap.set(cover, {
      rotationY,
      z: Number(gsap.getProperty(cover, "z")) || 3,
      transformOrigin: "left center",
      backfaceVisibility: "visible",
    });
    poseOpenShadows({ gutter, shadowLeft, shadowRight, shadowDepth });

    const clone = spawnDepartingNote(note);
    const cloneBounds = clone.getBoundingClientRect();
    const flyLeft = -(cloneBounds.left + cloneBounds.width + 64);
    const openLetters = noteOpenLetters(note);
    const flyingShadow =
      "1px 1px 0 rgb(210 160 165 / 0.4), 5px 10px 18px rgb(40 38 34 / 0.16)";
    const restShadow =
      "1px 1px 0 rgb(210 160 165 / 0.45), 3px 6px 14px rgb(40 38 34 / 0.14)";

    note.classList.remove("is-label-open");
    gsap.set(openLetters, { opacity: 0, y: 6 });
    gsap.set(note, { autoAlpha: 0, pointerEvents: "none" });

    const arriver = spawnFlyingNote(note, { autoAlpha: 0 });
    const arriverLetters = noteOpenLetters(arriver);
    gsap.set(arriverLetters, {
      opacity: 0,
      y: 10,
      rotation: -12,
      transformOrigin: "left bottom",
    });
    const arriverEraser = noteEraser(arriver);
    if (arriverEraser) {
      gsap.set(arriverEraser, { autoAlpha: 0 });
    }

    applyFlipLayout(true);

    const toAjar = 0.72 * Math.max(0.32, Math.abs(Math.min(rotationY, AJAR) - AJAR) / 160);
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onUpdate: () => applyFlipLayout(true),
      onComplete: () => {
        clone.remove();
        arriver.remove();
        settleClosed();
      },
    });

    tl.to(
      clone,
      {
        x: flyLeft,
        y: "-=36",
        rotation: "-=16",
        duration: 0.78,
        ease: "power2.in",
      },
      0,
    );
    tl.to(clone, { autoAlpha: 0, duration: 0.12, ease: "power1.in" }, 0.66);

    tl.addLabel("noteEnter", 0.82);
    tl.add(() => {
      parts.book.removeAttribute("data-closing-clip");
      gsap.set(note, {
        x: 0,
        y: 0,
        rotation: -90,
        z: 0,
        zIndex: 2,
        autoAlpha: 0,
        left: "calc(100% - var(--sticky-size) * 0.55)",
      });
      const tab = note.getBoundingClientRect();
      const enterX = Math.max(window.innerWidth - tab.left + 48, 280);
      poseFlyingNote(arriver, note, {
        x: enterX,
        y: -32,
        rotation: 8,
        z: 70,
        autoAlpha: 1,
        boxShadow: flyingShadow,
      });
    }, "noteEnter");

    tl.to(
      arriver,
      {
        x: hoverX,
        y: hoverY,
        rotation: -12,
        z: 48,
        duration: 1.22,
        ease: "power2.out",
      },
      "noteEnter+=0.02",
    );

    if (arriverLetters.length > 0) {
      tl.to(
        arriverLetters,
        {
          opacity: 1,
          y: 0,
          rotation: 0,
          duration: 0.18,
          stagger: 0.11,
          ease: "power2.out",
        },
        "+=0.28",
      );
    } else {
      tl.to(arriver, { duration: 0.28 });
    }

    tl.to(
      arriver,
      {
        x: 0,
        y: 0,
        rotation: -90,
        z: 0,
        duration: 0.78,
        ease: "power2.inOut",
      },
      "+=0.22",
    );

    tl.add(() => {
      arriver.remove();
      gsap.set(openLetters, { clearProps: "opacity,y,transform" });
      gsap.set(note, {
        x: 0,
        y: 0,
        rotation: -90,
        z: 0,
        zIndex: 2,
        autoAlpha: 1,
        pointerEvents: "auto",
        left: "calc(100% - var(--sticky-size) * 0.55)",
        boxShadow: restShadow,
      });
    });

    tl.add(() => {
      beginCoverClose();
    }, "+=0.12");
    tl.addLabel("coverClose");
    tl.to(gutter, { opacity: 0, duration: 0.48, ease: "power1.in", force3D: false }, "coverClose");
    tl.to(
      shadowLeft,
      { clipPath: STACK_CLIP_CLOSED, duration: 0.55, ease: "power2.in", force3D: false },
      "coverClose",
    );
    tl.to(shadowRight, { opacity: 0, duration: 0.5, ease: "power1.in", force3D: false }, "coverClose");
    tl.to(shadowDepth, { opacity: 0, duration: 0.5, ease: "power1.in", force3D: false }, "coverClose");

    tl.to(
      cover,
      {
        rotationY: 0,
        z: 3,
        duration: toAjar + 0.32,
        ease: "power2.in",
      },
      "coverClose+=0.12",
    );
    tl.to(
      cover,
      { z: 16, duration: Math.min(0.36, toAjar * 0.42), ease: "sine.out" },
      "coverClose+=0.12",
    );
    tl.to(
      book,
      { ...bookTilt(false), duration: 0.12 + toAjar + 0.32, ease: "sine.inOut" },
      "coverClose",
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
      z: 3,
      transformOrigin: "left center",
    });
    if (isOpenRef.current) {
      parts.pageLeft.classList.add("is-revealed");
      gsap.set(parts.scene, { width: poses.openW, x: 0 });
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
      parts.spread.style.width = "100%";
      clearSpineOpacity(parts.scene);
    } else {
      parts.pageLeft.classList.remove("is-revealed");
      restClosedShadows(parts);
      gsap.set(parts.note, { clearProps: "transform,x,y,z,zIndex" });
      gsap.set(parts.scene, { clearProps: "width,x" });
      parts.spread.style.width = "";
      clearSpineOpacity(parts.scene);
    }
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
      if (settleLockRef.current) {
        return;
      }
      if (bookRef.current?.classList.contains("is-animating")) {
        return;
      }
      syncIdle();
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.defaultPrevented) {
        return;
      }
      const book = bookRef.current;
      if (!book?.classList.contains("is-open")) {
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest(".sticky-note")) {
        return;
      }
      const copy = leafCopyUnderPoint(book, event.clientX, event.clientY);
      if (!copy) {
        return;
      }
      const max = copy.scrollHeight - copy.clientHeight;
      if (max <= 1) {
        return;
      }
      const next = Math.max(0, Math.min(max, copy.scrollTop + wheelDeltaY(event)));
      if (next === copy.scrollTop) {
        return;
      }
      copy.scrollTop = next;
      event.preventDefault();
    }

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    bookRef.current?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      bookRef.current?.removeEventListener("wheel", onWheel);
    };
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
    parts.book.classList.add("is-open");
    gsap.set(parts.cover, { transformOrigin: "left center", backfaceVisibility: "visible" });

    if (isOpen) {
      setAnimating(true);
      parts.book.classList.add("is-animating");
      if (fromIdle) {
        gsap.set(parts.cover, { rotationY: 0, z: 3, transformOrigin: "left center", backfaceVisibility: "visible" });
        gsap.set(parts.note, { x: 0, y: 0, rotation: -90, z: 0, zIndex: 2 });
        poseClosedShadows(parts);
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
          backfaceVisibility: "visible",
        });
        poseOpenShadows(parts);
      }
      playToClose();
    }
  }, [isOpen]);

  return (
    <div className="book-scene" data-open={isOpen} ref={sceneRef}>
      <div className="book-fx" aria-hidden="true">
        <div className="book-shadow-left" ref={shadowLeftRef} />
        <div className="book-shadow-right" ref={shadowRightRef} />
        <div className="book-shadow-depth" ref={shadowDepthRef} />
      </div>
      <div
        ref={bookRef}
        className={`book${isOpen || heldOpen ? " is-open" : ""}${animating ? " is-animating" : ""}`}
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
                  title="Like This Poem"
                  aria-label={`Like This Poem, ${heartCount} likes`}
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
          <StickyNote ref={noteRef} isOpen={isOpen} onToggle={onToggle} />
        </div>
      </div>
    </div>
  );
}
