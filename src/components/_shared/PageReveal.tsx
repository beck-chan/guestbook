"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { RouteLoading } from "@/components/_shared/RouteLoading";

type Phase = "wait" | "out" | "in";

const OUT_MS = 700;
const FIRST_OUT_MS = OUT_MS * 2;
const revealedPathnames = new Set<string>();

function isDocumentNavigate() {
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type === "navigate";
}

function subscribeClient() {
  return () => {};
}

export function PageReveal({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "main";
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [skipReveal] = useState(() => revealedPathnames.has(pathname));
  const [phase, setPhase] = useState<Phase>(skipReveal ? "in" : "wait");
  const isClient = useSyncExternalStore(subscribeClient, () => true, () => false);
  const [outMs, setOutMs] = useState<number | null>(skipReveal ? OUT_MS : null);

  if (isClient && outMs === null) {
    // Longer fade when this document was opened. A refresh keeps the shorter one.
    const slow = revealedPathnames.size === 0 && isDocumentNavigate();
    setOutMs(slow ? FIRST_OUT_MS : OUT_MS);
  }

  const onResolved = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("in");
      return;
    }
    setPhase((current) => (current === "wait" ? "out" : current));
  }, []);

  const onOutDone = useCallback(() => {
    setPhase((current) => (current === "out" ? "in" : current));
  }, []);

  useEffect(() => {
    if (phase !== "out" || outMs == null) return;
    const timer = window.setTimeout(onOutDone, outMs);
    return () => window.clearTimeout(timer);
  }, [phase, outMs, onOutDone]);

  useEffect(() => {
    if (phase !== "in") return;
    if (!revealedPathnames.has(pathname)) {
      revealedPathnames.clear();
    }
    revealedPathnames.add(pathname);
  }, [phase, pathname]);

  return (
    <>
      {phase !== "in" ? (
        <div
          className={["route-loading-layer", phase === "out" && "is-out"]
            .filter(Boolean)
            .join(" ")}
          style={
            outMs === FIRST_OUT_MS
              ? ({ "--route-out": `${FIRST_OUT_MS}ms` } as CSSProperties)
              : undefined
          }
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.propertyName !== "opacity") return;
            onOutDone();
          }}
        >
          <RouteLoading />
        </div>
      ) : null}
      <Suspense fallback={null}>
        <RevealContent
          as={Tag}
          className={className}
          animate={!skipReveal}
          visible={phase === "in"}
          armed={outMs !== null}
          onResolved={onResolved}
        >
          {children}
        </RevealContent>
      </Suspense>
    </>
  );
}

function RevealContent({
  as: Tag = "div",
  className,
  animate,
  visible,
  armed,
  onResolved,
  children,
}: {
  as?: "div" | "main";
  className?: string;
  animate: boolean;
  visible: boolean;
  armed: boolean;
  onResolved: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!armed) return;
    const frame = requestAnimationFrame(onResolved);
    return () => cancelAnimationFrame(frame);
  }, [armed, onResolved]);

  return (
    <Tag
      className={[animate && "page-enter", visible && "is-in", className]
        .filter(Boolean)
        .join(" ")}
      inert={visible ? undefined : true}
    >
      {children}
    </Tag>
  );
}
