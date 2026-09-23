"use client";

import { useEffect, useRef, useState } from "react";
import {
  SCALAR_STANDALONE_SRC,
  createScalarReferenceConfig,
} from "@/lib/docs/scalarConfig";
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

function isIntroductionSearchRow(option: HTMLElement) {
  const title = option.querySelector(".font-medium")?.textContent?.trim() ?? "";
  if (title === "Introduction") {
    return true;
  }
  const label = option.querySelector(".sr-only")?.textContent?.trim() ?? "";
  const text = option.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return /^heading\b/i.test(label) && /\bintroduction\b/i.test(text);
}

function hideIntroductionSearchRows(root: ParentNode) {
  const options: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.matches('[role="option"]')) {
    options.push(root);
  }
  if ("querySelectorAll" in root) {
    options.push(...root.querySelectorAll<HTMLElement>('[role="option"]'));
  }
  for (const option of options) {
    if (option.getAttribute("data-docs-hide-heading") === "true") {
      continue;
    }
    if (!isIntroductionSearchRow(option)) {
      continue;
    }
    option.setAttribute("data-docs-hide-heading", "true");
    option.style.setProperty("display", "none", "important");
  }
}

/** Sidebar buttons do not expose the introduction href, so match the item id. */
function hideIntroductionNav(host: HTMLElement) {
  for (const el of host.querySelectorAll<HTMLElement>("[data-sidebar-id]")) {
    const id = el.getAttribute("data-sidebar-id") ?? "";
    if (!id.endsWith("/description/introduction")) {
      continue;
    }
    const ownsChildren = el.querySelector("[data-sidebar-id]") !== null;
    if (!ownsChildren) {
      el.setAttribute("data-docs-intro", "true");
      continue;
    }
    for (const label of el.querySelectorAll<HTMLElement>("a, button, div")) {
      if (label.querySelector("[data-sidebar-id]")) {
        continue;
      }
      const text = label.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const name = label.getAttribute("aria-label") ?? "";
      if (text === "Introduction" || /introduction$/i.test(name)) {
        label.setAttribute("data-docs-intro", "true");
      }
    }
  }
}

function isRouterInitError(error: unknown) {
  return (
    error instanceof Error && error.message.includes("before initialization")
  );
}

/** Scalar writes the URL while mounting. Next throws if that happens first. */
function guardHistory() {
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  const queued: Array<() => void> = [];

  const wrap =
    (original: History["pushState"]): History["pushState"] =>
    (...args) => {
      try {
        return original(...args);
      } catch (error) {
        if (!isRouterInitError(error)) {
          throw error;
        }
        queued.push(() => {
          original(...args);
        });
      }
    };

  history.pushState = wrap(push);
  history.replaceState = wrap(replace);

  const replay = window.setInterval(() => {
    const job = queued[0];
    if (!job) {
      return;
    }
    try {
      job();
      queued.shift();
    } catch (error) {
      if (!isRouterInitError(error)) {
        queued.shift();
      }
    }
  }, 50);

  return () => {
    window.clearInterval(replay);
    history.pushState = push;
    history.replaceState = replace;
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
    script.src = SCALAR_STANDALONE_SRC;
    script.dataset.scalarStandalone = "true";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Scalar failed to load"));
    document.head.appendChild(script);
  });
}

export function DocsBotApiReferenceView({ spec }: { spec: OpenApiSpec }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    let instance: ScalarInstance | void;
    let observer: MutationObserver | undefined;
    const releaseHistory = guardHistory();

    let introFrame = 0;

    function watchSearch() {
      observer?.disconnect();
      observer = new MutationObserver((mutations) => {
        let intro = false;
        for (const mutation of mutations) {
          if (
            mutation.target instanceof Node &&
            hostRef.current?.contains(mutation.target)
          ) {
            intro = true;
          }
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) {
              continue;
            }
            hideIntroductionSearchRows(node);
            if (hostRef.current?.contains(node)) {
              intro = true;
            }
          }
        }
        if (!intro || introFrame) {
          return;
        }
        introFrame = window.requestAnimationFrame(() => {
          introFrame = 0;
          if (hostRef.current) {
            hideIntroductionNav(hostRef.current);
          }
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    function mountReference(Scalar: ScalarGlobal) {
      if (cancelled || !hostRef.current) {
        return;
      }
      instance?.destroy?.();
      instance = Scalar.createApiReference(hostRef.current, {
        ...createScalarReferenceConfig("embed"),
        content: spec,
      });
      if (cancelled) {
        instance?.destroy?.();
        return;
      }
      setMounted(true);
      hideIntroductionNav(hostRef.current);
      watchSearch();
    }

    const mountTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      loadStandalone()
        .then(() => {
          if (cancelled || !hostRef.current) {
            return;
          }
          const Scalar = (window as Window & { Scalar?: ScalarGlobal }).Scalar;
          if (!Scalar) {
            throw new Error("Scalar global is missing");
          }
          mountReference(Scalar);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            console.error(error);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(mountTimer);
      if (introFrame) {
        window.cancelAnimationFrame(introFrame);
      }
      releaseHistory();
      observer?.disconnect();
      setMounted(false);
      instance?.destroy?.();
      host.replaceChildren();
    };
  }, [spec]);

  return (
    <div className="docs-bot-api">
      {!mounted ? (
        <p className="docs-api-pending">Loading API reference…</p>
      ) : null}
      <div
        ref={hostRef}
        className={`docs-bot-api-host${mounted ? "" : " is-pending"}`}
        aria-busy={mounted ? undefined : true}
      />
    </div>
  );
}
