"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotionNow() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ChatStatusText({ text }: { text: string }) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionNow,
    () => false,
  );
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setCount((value) => (value + 1) % 4);
    }, 400);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  if (reduceMotion) return <>{text} ...</>;

  return (
    <>
      {text}{" "}
      <span className="docs-chat-retrieving-dots" aria-hidden="true">
        {".".repeat(count)}
      </span>
    </>
  );
}
