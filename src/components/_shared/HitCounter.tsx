"use client";

import { useEffect, useState } from "react";
import { flags } from "@/lib/flags";
import { FALLBACK_HIT_COUNT, HIT_COUNT_REFRESH_MS } from "@/lib/hitCount";

const POLL_MS = HIT_COUNT_REFRESH_MS;
const IS_PROD = process.env.NODE_ENV === "production";

type HitCounterProps = {
  count: number;
};

export function HitCounter({ count }: HitCounterProps) {
  const [displayed, setDisplayed] = useState(
    IS_PROD ? count : FALLBACK_HIT_COUNT,
  );
  const [prevCount, setPrevCount] = useState(count);

  if (IS_PROD && prevCount !== count) {
    setPrevCount(count);
    setDisplayed(count);
  }

  useEffect(() => {
    if (!IS_PROD) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/hits", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (cancelled || typeof data.count !== "number") return;
        setDisplayed(data.count);
      } catch {
        // keep last displayed value
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [count]);

  if (!flags.hitCounter) {
    return null;
  }

  const digits = String(displayed).padStart(6, "0");

  return (
    <div className="hit-counter" aria-hidden="true">
      <p className="hit-counter-digits">
        {digits.split("").map((digit, index) => (
          <span key={`${digit}-${index}`}>{digit}</span>
        ))}
      </p>
      <p className="hit-counter-label">hits</p>
    </div>
  );
}
