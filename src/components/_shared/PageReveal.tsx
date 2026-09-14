"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { RouteLoading } from "@/components/_shared/RouteLoading";

type Phase = "wait" | "out" | "in";

const OUT_MS = 700;
const revealedPathnames = new Set<string>();

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
    if (phase !== "out") return;
    const timer = window.setTimeout(onOutDone, OUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, onOutDone]);

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
  onResolved,
  children,
}: {
  as?: "div" | "main";
  className?: string;
  animate: boolean;
  visible: boolean;
  onResolved: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const frame = requestAnimationFrame(onResolved);
    return () => cancelAnimationFrame(frame);
  }, [onResolved]);

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
