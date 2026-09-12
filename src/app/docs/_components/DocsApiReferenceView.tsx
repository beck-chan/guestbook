"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { flags } from "@/lib/flags";
import { createScalarReferenceConfig } from "@/lib/docs/scalarConfig";
import {
  DEFAULT_PROJECT_REF,
  PROJECT_REF_PLACEHOLDER,
  displayProjectRef,
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

function sidebarBackground() {
  const nav = document.querySelector(".docs-sidenav");
  return nav ? getComputedStyle(nav).backgroundColor : "rgb(250, 246, 234)";
}

function isNoBodyLabel(el: HTMLElement) {
  if (el.textContent?.trim() !== "No Body") {
    return false;
  }
  if (el.children.length === 0) {
    return true;
  }
  return (
    el.children.length === 1 &&
    el.children[0].textContent?.trim() === "No Body"
  );
}

function tintEmptyResponseCopy(root: ParentNode = document) {
  const color = sidebarBackground();
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    if (el.shadowRoot) {
      tintEmptyResponseCopy(el.shadowRoot);
    }
    if (!isNoBodyLabel(el)) {
      continue;
    }
    el.style.setProperty("color", color, "important");
    const child = el.children[0];
    if (child instanceof HTMLElement) {
      child.style.setProperty("color", color, "important");
    }
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
  const [draftRef, setDraftRef] = useState(PROJECT_REF_PLACEHOLDER);
  const [appliedRef, setAppliedRef] = useState(DEFAULT_PROJECT_REF);

  useEffect(() => {
    if (!flags.public) {
      return;
    }
    const stored = readStoredProjectRef();
    setDraftRef(displayProjectRef(stored));
    setAppliedRef(stored);
  }, []);

  useEffect(() => {
    hideScalarHeadingSearchResults();
    tintEmptyResponseCopy();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            hideScalarHeadingSearchResults(node);
            tintEmptyResponseCopy(node);
          }
        }
      }
      tintEmptyResponseCopy();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
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
    setDraftRef(displayProjectRef(next));
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
            <span>
              <b>Enter Your Supabase Project ID</b> — Your{" "}
              <code>{"<your-database-url>"}</code> from your{" "}
              <code>
                NEXT_PUBLIC_SUPABASE_URL=https://{"<your-database-url>"}.supabase.co
              </code>
            </span>
            <input
              value={draftRef}
              onChange={(event) => setDraftRef(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={PROJECT_REF_PLACEHOLDER}
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
