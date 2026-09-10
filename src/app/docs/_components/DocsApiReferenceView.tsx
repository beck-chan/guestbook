"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { flags } from "@/lib/flags";
import { createScalarReferenceConfig } from "@/lib/docs/scalarConfig";
import {
  DEFAULT_PROJECT_REF,
  envSupabaseProjectRef,
  parseProjectRef,
  publicApiServers,
  supabaseRestUrl,
} from "@/lib/docs/publicApiServers";
import type { OpenApiSpec } from "@/lib/docs/typesToOpenApi";

const PROJECT_REF_KEY = "guestbook-docs-api-project-ref";

type ScalarInstance = {
  destroy?: () => void;
  updateConfiguration?: (configuration: Record<string, unknown>) => void;
};

type ScalarGlobal = {
  createApiReference: (
    element: HTMLElement,
    configuration: Record<string, unknown>,
  ) => ScalarInstance | void;
};

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

function readStoredProjectRef() {
  try {
    return parseProjectRef(sessionStorage.getItem(PROJECT_REF_KEY) ?? "")
      || DEFAULT_PROJECT_REF;
  } catch {
    return DEFAULT_PROJECT_REF;
  }
}

/** Hide Scalar search rows typed as "heading" (info intro / section labels). */
function hideScalarHeadingSearchResults(root: ParentNode = document) {
  for (const option of root.querySelectorAll<HTMLElement>(
    'a[role="option"]:not([data-docs-hide-heading="true"])',
  )) {
    const label = option.querySelector(".sr-only")?.textContent?.trimStart();
    if (label?.startsWith("Heading")) {
      option.setAttribute("data-docs-hide-heading", "true");
    }
  }
}

export function DocsApiReferenceView({ spec }: { spec: OpenApiSpec }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [draftRef, setDraftRef] = useState(DEFAULT_PROJECT_REF);
  const [appliedRef, setAppliedRef] = useState(DEFAULT_PROJECT_REF);

  useEffect(() => {
    if (!flags.public) {
      return;
    }
    const stored = readStoredProjectRef();
    setDraftRef(stored);
    setAppliedRef(stored);
  }, []);

  useEffect(() => {
    hideScalarHeadingSearchResults();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            hideScalarHeadingSearchResults(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
        instance = Scalar.createApiReference(hostRef.current, {
          ...createScalarReferenceConfig(),
          content: spec,
          ...(flags.public
            ? { servers: publicApiServers(appliedRef) }
            : flags.apiTest
              ? { servers: publicApiServers(envSupabaseProjectRef()) }
              : {}),
        });
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
  }, [spec, appliedRef]);

  function applyProjectRef(event: FormEvent) {
    event.preventDefault();
    const next = parseProjectRef(draftRef) || DEFAULT_PROJECT_REF;
    setDraftRef(next);
    setAppliedRef(next);
    try {
      sessionStorage.setItem(PROJECT_REF_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return (
    <div className="docs-api-explorer">
      {flags.public ? (
        <form className="docs-api-server" onSubmit={applyProjectRef}>
          <label>
            Enter Your Supabase Project ID
            <input
              value={draftRef}
              onChange={(event) => setDraftRef(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={DEFAULT_PROJECT_REF}
            />
          </label>
          <button type="submit">Use this project</button>
          <p className="docs-api-server-url">
            Test calls use {supabaseRestUrl(appliedRef)}
          </p>
        </form>
      ) : null}
      <div ref={hostRef} className="docs-api-reference" />
    </div>
  );
}
