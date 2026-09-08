"use client";

import { useEffect, useRef } from "react";
import type { OpenApiSpec } from "@/lib/docs/typesToOpenApi";

type ScalarInstance = {
  destroy?: () => void;
};

type ScalarGlobal = {
  createApiReference: (
    element: HTMLElement,
    configuration: Record<string, unknown>,
  ) => ScalarInstance | void;
};

const SCALAR_CSS = `
.scalar-app,
.scalar-app * {
  font-family: var(--futura-font) !important;
}
`;

function scalarConfig(spec: OpenApiSpec) {
  return {
    content: spec,
    layout: "classic",
    theme: "none",
    darkMode: false,
    forceDarkModeState: "light",
    hideDarkModeToggle: true,
    isEditable: false,
    documentDownloadType: "none",
    showSidebar: true,
    showDeveloperTools: "always",
    customCss: SCALAR_CSS,
  };
}

function loadStandalone() {
  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-scalar-standalone]",
  );
  if (existing) {
    return existing.dataset.loaded === "true"
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("Scalar failed to load")),
            { once: true },
          );
        });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/docs/api/scalar-standalone";
    script.dataset.scalarStandalone = "true";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Scalar failed to load"));
    document.head.appendChild(script);
  });
}

export function DocsApiReferenceView({ spec }: { spec: OpenApiSpec }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    let instance: ScalarInstance | void;

    loadStandalone()
      .then(() => {
        if (cancelled || !hostRef.current) {
          return;
        }
        const Scalar = (window as Window & { Scalar?: ScalarGlobal }).Scalar;
        if (!Scalar) {
          throw new Error("Scalar global is missing");
        }
        instance = Scalar.createApiReference(hostRef.current, scalarConfig(spec));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error(error);
        }
      });

    return () => {
      cancelled = true;
      instance?.destroy?.();
      host.replaceChildren();
    };
  }, [spec]);

  return <div ref={hostRef} className="docs-api-reference" />;
}
