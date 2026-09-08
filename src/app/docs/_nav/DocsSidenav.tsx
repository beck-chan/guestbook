"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DocsSearch, openScalarSearch } from "../_components/DocsSearch";
import { DocsApiNav } from "./DocsApiNav";
import { DocsNav } from "./DocsNav";
import type { OpenApiNavSection } from "@/lib/docs/typesToOpenApi";

const MOBILE_QUERY = "(max-width: 720px)";

function isApiPath(pathname: string) {
  return pathname === "/docs/api" || pathname === "/docs/api/";
}

function BrandTitle({ isApi }: { isApi: boolean }) {
  return (
    <>
      {isApi ? "API" : "Doc"}
      <span className="docs-brand-heart">
        {/* Hello Honey s.1 (\uE019) is the ending heart flourish */}
        {"\uE019"}
      </span>
    </>
  );
}

export function DocsSidenav({ apiNav }: { apiNav: OpenApiNavSection[] }) {
  const pathname = usePathname();
  const isApi = isApiPath(pathname);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [navPath, setNavPath] = useState(pathname);

  if (navPath !== pathname) {
    setNavPath(pathname);
    setOpen(false);
  }

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

  const brandHref = isApi ? "/docs/api" : "/docs";
  const brandLabel = isApi
    ? "y2k Guestbook API home"
    : "y2k Guestbook Docs home";
  const searchLabel = isApi ? "Search API" : "Search docs";
  const searchClick = isApi ? openScalarSearch : undefined;

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
            href={brandHref}
            className="docs-topbar-title"
            aria-label={brandLabel}
            onClick={() => setOpen(false)}
          >
            <span className="docs-brand-kicker">y2k guestbook</span>
            <span className="docs-brand-title">
              <BrandTitle isApi={isApi} />
            </span>
          </Link>
          <DocsSearch
            variant="icon"
            label={searchLabel}
            onClick={searchClick}
          />
        </div>
        <div
          id={panelId}
          className="docs-sidenav-panel"
          inert={isMobile && !open ? true : undefined}
        >
          <div className="docs-brand">
            <p className="docs-brand-kicker">y2k guestbook</p>
            <Link
              href={brandHref}
              className="docs-brand-title"
              aria-label={brandLabel}
              onClick={() => setOpen(false)}
            >
              <BrandTitle isApi={isApi} />
            </Link>
          </div>
          <DocsSearch
            variant="bar"
            label={searchLabel}
            onClick={searchClick}
          />
          {isApi ? (
            <DocsApiNav
              sections={apiNav}
              onNavigate={() => setOpen(false)}
            />
          ) : (
            <DocsNav onNavigate={() => setOpen(false)} />
          )}
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
