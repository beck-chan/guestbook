"use client";

import { useEffect, useRef, useState } from "react";

export function DocsCodeBlock({
  children,
  className,
  ...props
}: React.ComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current != null) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function copy() {
    const text = preRef.current?.textContent ?? "";
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetTimer.current != null) {
        clearTimeout(resetTimer.current);
      }
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="docs-code-block">
      <button
        type="button"
        className={`docs-code-copy${copied ? " is-copied" : ""}`}
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
      />
      <pre
        ref={preRef}
        {...props}
        className={["docs-code", className].filter(Boolean).join(" ")}
      >
        {children}
      </pre>
    </div>
  );
}
