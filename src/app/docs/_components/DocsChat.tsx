"use client";

import { useEffect, useState, type ComponentType } from "react";
import { DocsChatPending } from "./DocsChatPending";

type PanelProps = {
  onMaximizedChange?: (maximized: boolean) => void;
};

export function DocsChat() {
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<PanelProps> | null>(null);

  useEffect(() => {
    if (!open || Panel) return;
    let cancelled = false;
    import("./DocsChatPanel").then((mod) => {
      if (!cancelled) {
        setPanel(() => mod.DocsChatPanel);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, Panel]);

  return (
    <div className={maximized ? "docs-chat docs-chat-is-max" : "docs-chat"}>
      {open ? Panel ? <Panel onMaximizedChange={setMaximized} /> : <DocsChatPending /> : null}
      <button
        type="button"
        className="docs-chat-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "hide chat" : "ask the documentation"}
      </button>
    </div>
  );
}
