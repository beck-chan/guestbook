"use client";

import { useEffect, useState } from "react";
import { flags } from "@/lib/flags";
import { FALLBACK_HIT_COUNT } from "@/lib/hitCount";

const STORAGE_KEY = "guestbook.hit-counted";
const POLL_MS = 45_000;

type HitCounterProps = {
  count: number;
};

export function HitCounter({ count }: HitCounterProps) {
  const [displayed, setDisplayed] = useState(count);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setDisplayed(FALLBACK_HIT_COUNT);
      return;
    }

    let firstVisitBonus = 0;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") {
        firstVisitBonus = 1;
        localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }

    setDisplayed((current) => Math.max(current, count + firstVisitBonus));

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/hits");
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (cancelled || typeof data.count !== "number") return;
        setDisplayed((current) => Math.max(current, data.count as number));
      } catch {
        // keep last displayed value
      }
    }

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
