"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OpenApiNavSection } from "@/lib/docs/typesToOpenApi";

type DocsApiNavContextValue = {
  sections: OpenApiNavSection[];
  ready: boolean;
  setSections: (sections: OpenApiNavSection[]) => void;
  clearSections: () => void;
};

const DocsApiNavContext = createContext<DocsApiNavContextValue | null>(null);

export function DocsApiNavProvider({ children }: { children: ReactNode }) {
  const [sections, setSectionsState] = useState<OpenApiNavSection[]>([]);
  const [ready, setReady] = useState(false);
  const setSections = useCallback((next: OpenApiNavSection[]) => {
    setSectionsState(next);
    setReady(true);
  }, []);
  const clearSections = useCallback(() => {
    setSectionsState([]);
    setReady(false);
  }, []);
  const value = useMemo(
    () => ({ sections, ready, setSections, clearSections }),
    [sections, ready, setSections, clearSections],
  );

  return (
    <DocsApiNavContext.Provider value={value}>
      {children}
    </DocsApiNavContext.Provider>
  );
}

export function useDocsApiNav() {
  const context = useContext(DocsApiNavContext);
  if (!context) {
    throw new Error("useDocsApiNav must be used within DocsApiNavProvider");
  }
  return context;
}

export function DocsApiNavHydrator({
  sections,
}: {
  sections: OpenApiNavSection[];
}) {
  const { setSections, clearSections } = useDocsApiNav();

  useLayoutEffect(() => {
    setSections(sections);
    return () => clearSections();
  }, [sections, setSections, clearSections]);

  return null;
}

export function DocsApiNavFallback() {
  return (
    <nav
      className="docs-nav docs-api-nav is-pending"
      aria-busy="true"
      aria-label="API operations"
    >
      <p className="docs-api-nav-pending">Loading API catalog…</p>
    </nav>
  );
}
