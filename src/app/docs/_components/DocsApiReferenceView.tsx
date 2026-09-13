"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { flags } from "@/lib/flags";
import { createScalarReferenceConfig } from "@/lib/docs/scalarConfig";
import { rememberApiKeyFromAuthInput } from "@/lib/docs/scalarApiKey";
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

/** Hide Scalar search rows typed as "heading" (info intro only; keep tag headings). */
function isScalarIntroHeading(option: HTMLElement) {
  const label = option.querySelector(".sr-only")?.textContent?.trim() ?? "";
  if (/^heading\b/i.test(label)) {
    return true;
  }
  const meta = option.querySelector(".text-c-2")?.textContent?.trim() ?? "";
  if (/^heading$/i.test(meta)) {
    return true;
  }
  const text = option.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (/^the api below reflects/i.test(text)) {
    return true;
  }
  return /\bheading\b/i.test(text) && /the api below reflects/i.test(text);
}

function isHiddenApiSearchRow(option: HTMLElement) {
  const text = option.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return /rls_auto_enable|hook_before_user_created/i.test(text);
}

function decorateScalarSearchResults(root: ParentNode = document) {
  const options: HTMLElement[] = [];
  const visit = (node: ParentNode) => {
    if (node instanceof Element && node.matches('[role="option"]')) {
      options.push(node as HTMLElement);
    }
    if ("querySelectorAll" in node) {
      options.push(...node.querySelectorAll<HTMLElement>('[role="option"]'));
    }
    const hosts =
      node instanceof Element
        ? [node, ...node.querySelectorAll("*")]
        : [...node.querySelectorAll("*")];
    for (const host of hosts) {
      if (host.shadowRoot) {
        visit(host.shadowRoot);
      }
    }
  };
  visit(root);
  for (const option of options) {
    if (isScalarIntroHeading(option) || isHiddenApiSearchRow(option)) {
      option.setAttribute("data-docs-hide-heading", "true");
      option.style.setProperty("display", "none", "important");
      continue;
    }
    if (
      option.getAttribute("data-docs-hide-op-desc") === "true" ||
      option.getAttribute("data-docs-hide-heading") === "true"
    ) {
      continue;
    }
    const label = option.querySelector(".sr-only")?.textContent?.trimStart() ?? "";
    if (/^operation\b/i.test(label)) {
      option.setAttribute("data-docs-hide-op-desc", "true");
      continue;
    }
    const title = option.querySelector(".font-medium")?.textContent?.trim() ?? "";
    if (title.startsWith("/")) {
      option.setAttribute("data-docs-hide-op-desc", "true");
    }
  }
}

function wrapInlineHttpMethods(root: ParentNode = document) {
  const scopes: Element[] = [];
  if (root instanceof Element && root.matches(".markdown")) {
    scopes.push(root);
  }
  if ("querySelectorAll" in root) {
    scopes.push(...root.querySelectorAll(".markdown"));
  }
  for (const scope of scopes) {
    if (scope.closest(".scalar-modal-search, .scalar-card, code, pre")) {
      continue;
    }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (
          parent.closest(
            "code, pre, .docs-api-nav-method, .docs-api-verb, .docs-api-operation-title",
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!/\b(GET|PUT|POST|DELETE|PATCH|HEAD|OPTIONS)\b/.test(node.textContent ?? "")) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Text);
    }
    for (const node of nodes) {
      const parts = (node.textContent ?? "").split(
        /\b(GET|PUT|POST|DELETE|PATCH|HEAD|OPTIONS)\b/,
      );
      if (parts.length < 2) {
        continue;
      }
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (OPERATION_VERBS.has(part)) {
          const span = document.createElement("span");
          span.className = "docs-api-nav-method docs-api-verb";
          span.dataset.method = part;
          span.textContent = part;
          frag.append(span);
        } else if (part) {
          frag.append(part);
        }
      }
      node.replaceWith(frag);
    }
  }
}

const OPERATION_VERBS = new Set([
  "GET",
  "PUT",
  "POST",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);

function methodFromSectionId(id: string) {
  const match = id.match(
    /\/(GET|PUT|POST|DELETE|PATCH|HEAD|OPTIONS)(\/.*)$/i,
  );
  return match ? match[1].toUpperCase() : null;
}

function applyOperationTitleBadge(
  heading: HTMLElement,
  method: string,
  pathLabel: string,
) {
  if (heading.dataset.docsMethodBadge === method) {
    return;
  }
  heading.dataset.docsMethodBadge = method;
  heading.classList.add("docs-api-operation-title");
  const methodEl = document.createElement("span");
  methodEl.className = "docs-api-nav-method";
  methodEl.dataset.method = method;
  methodEl.textContent = method;
  const pathEl = document.createElement("span");
  pathEl.className = "docs-api-operation-path";
  pathEl.textContent = pathLabel;
  const anchor =
    heading.childElementCount === 1 ? heading.querySelector("a") : null;
  if (anchor) {
    anchor.replaceChildren(methodEl, pathEl);
  } else {
    heading.replaceChildren(methodEl, pathEl);
  }
}

/** Keep hashes intact; only restyle the visible Scalar operation title. */
function badgeScalarOperationTitles(root: ParentNode = document) {
  const sections = [
    ...(root instanceof HTMLElement && root.id.startsWith("api/tag/")
      ? [root]
      : []),
    ...root.querySelectorAll<HTMLElement>("[id^='api/tag/']"),
  ];
  for (const section of sections) {
    const method = methodFromSectionId(section.id);
    if (!method || !OPERATION_VERBS.has(method)) {
      continue;
    }
    for (const heading of section.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, [class*='section-header']",
    )) {
      if (heading.closest(".scalar-card, .docs-article, .docs-sidenav")) {
        continue;
      }
      const text = heading.textContent?.trim() ?? "";
      const withMethod = text.match(
        /^(GET|PUT|POST|DELETE|PATCH|HEAD|OPTIONS)\s+(\/.+)$/,
      );
      const pathOnly = text.startsWith("/");
      if (!withMethod && !pathOnly) {
        continue;
      }
      applyOperationTitleBadge(
        heading,
        method,
        withMethod ? withMethod[2] : text,
      );
      break;
    }
  }
}

export function DocsApiReferenceView({ spec }: { spec: OpenApiSpec }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [draftRef, setDraftRef] = useState(PROJECT_REF_PLACEHOLDER);
  const [appliedRef, setAppliedRef] = useState(DEFAULT_PROJECT_REF);
  const [serverReady, setServerReady] = useState(!flags.public);

  useEffect(() => {
    if (!flags.public) {
      return;
    }
    const stored = readStoredProjectRef();
    setDraftRef(displayProjectRef(stored));
    setAppliedRef(stored);
    setServerReady(true);
  }, []);

  useEffect(() => {
    const capture = (event: Event) => {
      rememberApiKeyFromAuthInput(event.target);
    };
    document.addEventListener("input", capture, true);
    document.addEventListener("change", capture, true);
    return () => {
      document.removeEventListener("input", capture, true);
      document.removeEventListener("change", capture, true);
    };
  }, []);

  useEffect(() => {
    decorateScalarSearchResults();
    wrapInlineHttpMethods();
    tintEmptyResponseCopy();
    badgeScalarOperationTitles();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            decorateScalarSearchResults(node);
            wrapInlineHttpMethods(node);
            tintEmptyResponseCopy(node);
            badgeScalarOperationTitles(node);
          }
        }
      }
      wrapInlineHttpMethods();
      decorateScalarSearchResults();
      tintEmptyResponseCopy();
      badgeScalarOperationTitles();
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
    if (!host || !serverReady) {
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
  }, [spec, appliedRef, serverReady]);

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
