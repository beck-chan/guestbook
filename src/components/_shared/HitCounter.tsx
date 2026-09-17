"use client";

import { useEffect, useState } from "react";
import { flags } from "@/lib/flags";
import { HIT_COUNT_REFRESH_MS } from "@/lib/hitCount";

const POLL_MS = HIT_COUNT_REFRESH_MS;
const IS_PROD = process.env.NODE_ENV === "production";

type HitCounterProps = {
  count: number;
  error?: boolean;
};

export function HitCounter({ count, error = false }: HitCounterProps) {
  const [displayed, setDisplayed] = useState(count);
  const [failed, setFailed] = useState(error);
  const [prevCount, setPrevCount] = useState(count);
  const [prevError, setPrevError] = useState(error);

  if (prevCount !== count || prevError !== error) {
    setPrevCount(count);
    setPrevError(error);
    setDisplayed(count);
    setFailed(error);
  }

  useEffect(() => {
    if (!IS_PROD) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/hits", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const data = (await response.json()) as {
          count?: number;
          error?: boolean;
        };
        if (cancelled) return;
        if (data.error) {
          setFailed(true);
          return;
        }
        if (typeof data.count !== "number") return;
        setFailed(false);
        setDisplayed(data.count);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [count, error]);

  if (!flags.hitCounter) {
    return null;
  }

  const digits = failed ? "ERROR!" : String(displayed).padStart(6, "0");

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
