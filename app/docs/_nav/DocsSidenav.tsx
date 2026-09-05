"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DocsSearch } from "../_components/DocsSearch";
import { DocsNav } from "./DocsNav";

const MOBILE_QUERY = "(max-width: 720px)";

export function DocsSidenav() {
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);

    function sync() {
      setIsMobile(media.matches);
      if (!media.matches) {
        setOpen(false);
      }
    }

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || !isMobile) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  return (
    <>
      <aside className={`docs-sidenav${open ? " is-open" : ""}`}>
        <div className="docs-topbar">
          <button
            type="button"
            className="docs-menu-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close documentation menu" : "Open documentation menu"}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="docs-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <Link
            href="/docs"
            className="docs-topbar-title"
            aria-label="y2k Guestbook Docs home"
            onClick={() => setOpen(false)}
          >
            <span className="docs-brand-kicker">y2k guestbook</span>
            <span className="docs-brand-title">
              Doc
              <span className="docs-brand-heart">
                {/* Hello Honey s.1 (\uE019) is the ending heart flourish */}
                {"\uE019"}
              </span>
            </span>
          </Link>
          <DocsSearch variant="icon" />
        </div>
        <div
          id={panelId}
          className="docs-sidenav-panel"
          inert={isMobile && !open ? true : undefined}
        >
          <div className="docs-brand">
            <p className="docs-brand-kicker">y2k guestbook</p>
            <Link
              href="/docs"
              className="docs-brand-title"
              aria-label="y2k Guestbook Docs home"
              onClick={() => setOpen(false)}
            >
              Doc
              <span className="docs-brand-heart">
                {/* Hello Honey s.1 (\uE019) is the ending heart flourish */}
                {"\uE019"}
              </span>
            </Link>
          </div>
          <DocsSearch variant="bar" />
          <DocsNav onNavigate={() => setOpen(false)} />
        </div>
      </aside>
      {open ? (
        <button
          type="button"
          className="docs-sidenav-backdrop"
          aria-label="Close documentation menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
