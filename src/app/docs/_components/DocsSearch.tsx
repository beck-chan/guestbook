"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import MiniSearch from "minisearch";
import { expandDocsSearchTerm } from "@/lib/docs/searchTerms";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { DocsSearchDoc } from "@/lib/docs/searchTypes";

type SearchStatus = "idle" | "loading" | "ready" | "error";

type DocsSearchContextValue = {
  documents: DocsSearchDoc[];
  status: SearchStatus;
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const DocsSearchContext = createContext<DocsSearchContextValue>({
  documents: [],
  status: "idle",
  open: false,
  openSearch: () => {},
  closeSearch: () => {},
});

function subscribeNever() {
  return () => {};
}

function useDocsSearch() {
  return useContext(DocsSearchContext);
}

function SearchGlyph() {
  return (
    <svg
      className="docs-search-glyph"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M15.4 15.4 20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function isMacPlatform() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

function SearchBarFace({ label }: { label: string }) {
  return (
    <>
      <SearchGlyph />
      <span className="docs-search-label">{label}</span>
      <kbd className="docs-search-kbd" aria-hidden="true">
        ⌘K / Ctrl+K
      </kbd>
    </>
  );
}

export function openScalarSearch() {
  const host = document.querySelector(".docs-api-reference, .scalar-app");
  const trigger = host?.querySelector<HTMLElement>(
    'button[aria-label*="Search" i], button[class*="search" i], [class*="sidebar-search"] button',
  );
  if (trigger) {
    trigger.click();
    return;
  }

  const isMac = isMacPlatform();
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function isApiPath(pathname: string) {
  return pathname === "/docs/api" || pathname === "/docs/api/";
}

function buildMiniSearch(documents: DocsSearchDoc[]) {
  const mini = new MiniSearch<DocsSearchDoc>({
    fields: ["title", "heading", "body", "section"],
    storeFields: ["id", "href", "title", "heading", "section", "body"],
    idField: "id",
    processTerm: (term) => expandDocsSearchTerm(term),
    searchOptions: {
      boost: { heading: 3, title: 2, section: 1.5, body: 1 },
      prefix: true,
      // Longer queries need more edit budget so typos still match stems.
      fuzzy: (term) => (term.length >= 6 ? 0.35 : 0.2),
    },
  });
  const unique: DocsSearchDoc[] = [];
  const seen = new Set<string>();
  for (const doc of documents) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    unique.push(doc);
  }
  if (unique.length > 0) {
    mini.addAll(unique);
  }
  return mini;
}

type Hit = DocsSearchDoc & { score?: number };

function DocsSearchOverlay({
  documents,
  status,
  open,
  onClose,
}: {
  documents: DocsSearchDoc[];
  status: SearchStatus;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const miniSearch = useMemo(() => buildMiniSearch(documents), [documents]);
  const hits = useMemo(() => {
    const q = query.trim();
    if (!open || !q) {
      return [] as Hit[];
    }
    return miniSearch.search(q).slice(0, 10) as unknown as Hit[];
  }, [miniSearch, query, open]);
  const safeActive = hits.length === 0 ? 0 : Math.min(active, hits.length - 1);

  if (!open && query !== "") {
    setQuery("");
  }
  if (!open && active !== 0) {
    setActive(0);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function closeAndGo(href: string) {
    onClose();
    router.push(href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) =>
        hits.length === 0 ? 0 : Math.min(current + 1, hits.length - 1),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[safeActive] ?? hits[0];
      if (hit) {
        closeAndGo(hit.href);
      }
    }
  }

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="docs-search-overlay" role="presentation">
      <button
        type="button"
        className="docs-search-backdrop"
        aria-label="Close search"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        id={dialogId}
        className="docs-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div className="docs-search-dialog-bar">
          <SearchGlyph />
          <input
            ref={inputRef}
            className="docs-search-input"
            type="search"
            value={query}
            placeholder="Search Documentation"
            aria-label="Search Documentation"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={
              hits[safeActive] ? `${listId}-opt-${safeActive}` : undefined
            }
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
          />
          <kbd className="docs-search-esc">esc</kbd>
        </div>
        {status === "loading" ? (
          <p className="docs-search-hint">Indexing…</p>
        ) : status === "error" ? (
          <p className="docs-search-empty">Search index could not be loaded</p>
        ) : query.trim() ? (
          <ul id={listId} className="docs-search-results" role="listbox">
            {hits.length === 0 ? (
              <li className="docs-search-empty">No Results Found</li>
            ) : (
              hits.map((hit, index) => (
                <li key={hit.id} role="option" aria-selected={index === safeActive}>
                  <Link
                    id={`${listId}-opt-${index}`}
                    className={`docs-search-hit${index === safeActive ? " is-active" : ""}`}
                    href={hit.href}
                    onClick={() => onClose()}
                    onMouseEnter={() => setActive(index)}
                  >
                    <span className="docs-search-hit-heading">
                      {hit.heading}
                    </span>
                    <span className="docs-search-hit-meta">
                      {hit.section ? `${hit.section} · ` : ""}
                      {hit.title}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : (
          <p className="docs-search-hint">Begin typing to search documentation ...</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function DocsSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocsSearchDoc[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const statusRef = useRef<SearchStatus>("idle");
  const open = openPath !== null && openPath === pathname;

  const closeSearch = () => setOpenPath(null);

  const ensureIndex = useCallback(() => {
    if (isApiPath(pathname) || isApiPath(window.location.pathname)) {
      return;
    }
    if (statusRef.current === "loading" || statusRef.current === "ready") {
      return;
    }
    statusRef.current = "loading";
    setStatus("loading");
    void fetch("/docs/search-index")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Search index failed: ${response.status}`);
        }
        return (await response.json()) as DocsSearchDoc[];
      })
      .then((docs) => {
        statusRef.current = "ready";
        setDocuments(Array.isArray(docs) ? docs : []);
        setStatus("ready");
      })
      .catch(() => {
        statusRef.current = "error";
        setStatus("error");
      });
  }, [pathname]);

  const openSearch = () => {
    if (isApiPath(pathname) || isApiPath(window.location.pathname)) {
      return;
    }
    ensureIndex();
    setOpenPath(pathname);
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isChord =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isChord) return;
      if (isApiPath(window.location.pathname)) return;
      event.preventDefault();
      ensureIndex();
      setOpenPath(pathname);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ensureIndex, pathname]);

  return (
    <DocsSearchContext.Provider
      value={{ documents, status, open, openSearch, closeSearch }}
    >
      {children}
      <DocsSearchOverlay
        documents={documents}
        status={status}
        open={open}
        onClose={closeSearch}
      />
    </DocsSearchContext.Provider>
  );
}

export function DocsSearch({
  variant,
  onClick,
  label = "Search Docs",
  onNavigate,
}: {
  variant: "bar" | "icon";
  onClick?: () => void;
  label?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const { open, openSearch } = useDocsSearch();
  const isApi = isApiPath(pathname);
  const useMini = !isApi && !onClick;

  function handleOpen() {
    openSearch();
    onNavigate?.();
  }

  if (!useMini) {
    const handleClick = onClick ?? (isApi ? openScalarSearch : undefined);
    if (variant === "icon") {
      return (
        <button
          type="button"
          className="docs-search docs-search-icon"
          aria-label={label}
          onClick={handleClick}
        >
          <SearchGlyph />
        </button>
      );
    }

    return (
      <button
        type="button"
        className="docs-search docs-search-bar"
        aria-label={label}
        onClick={handleClick}
      >
        <SearchBarFace label={label} />
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="docs-search docs-search-icon"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={handleOpen}
      >
        <SearchGlyph />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="docs-search docs-search-bar"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={handleOpen}
    >
      <SearchBarFace label={label} />
    </button>
  );
}
