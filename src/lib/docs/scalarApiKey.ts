const API_KEY_STORE = "guestbook-docs-api-apikey";

type SecurityItem = {
  in?: string;
  name?: string;
  value?: string;
};

export type ScalarRequestBuilder = {
  headers: {
    get(name: string): string | null;
    set(name: string, value: string): void;
    delete?(name: string): void;
  };
  security?: SecurityItem[];
};

type PluginAuthSecrets = { type?: string } & Record<string, unknown>;

export type ScalarAuthState = {
  export: () => Record<
    string,
    { secrets?: Record<string, PluginAuthSecrets | undefined> }
  >;
};

function trimSecret(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function jwtPayload(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) {
      b64 += "=".repeat(4 - pad);
    }
    return JSON.parse(atob(b64)) as { role?: string };
  } catch {
    return null;
  }
}

/** Anon / publishable keys only — never a user session JWT. */
export function isDocsApiKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^sb_publishable_/i.test(trimmed)) {
    return true;
  }
  const role = jwtPayload(trimmed)?.role;
  return role === "anon" || role === "service_role";
}

function secretApiKey(secrets: PluginAuthSecrets | undefined) {
  if (!secrets) {
    return "";
  }
  const next =
    trimSecret(secrets.value) ||
    trimSecret(secrets.token) ||
    trimSecret(secrets.apiKey);
  return isDocsApiKey(next) ? next : "";
}

export function rememberDocsApiKey(value: string) {
  const trimmed = value.trim();
  if (!isDocsApiKey(trimmed)) {
    return;
  }
  try {
    sessionStorage.setItem(API_KEY_STORE, trimmed);
  } catch {
    /* quota / private mode */
  }
}

export function readDocsApiKey() {
  try {
    const stored = sessionStorage.getItem(API_KEY_STORE)?.trim() ?? "";
    if (isDocsApiKey(stored)) {
      return stored;
    }
    if (stored) {
      sessionStorage.removeItem(API_KEY_STORE);
    }
    return "";
  } catch {
    return "";
  }
}

export function apiKeyFromAuth(auth?: ScalarAuthState) {
  if (!auth) {
    return "";
  }
  try {
    for (const doc of Object.values(auth.export())) {
      const named = secretApiKey(doc.secrets?.apikey);
      if (named) {
        return named;
      }
      for (const [name, secrets] of Object.entries(doc.secrets ?? {})) {
        if (!/apikey/i.test(name)) {
          continue;
        }
        const next = secretApiKey(secrets);
        if (next) {
          return next;
        }
      }
    }
  } catch {
    /* Scalar auth snapshot can be missing during teardown */
  }
  return "";
}

let latestAuth: ScalarAuthState | undefined;

export function applyRememberedApiKey(
  requestBuilder: ScalarRequestBuilder,
  auth?: ScalarAuthState,
) {
  const fromHeader = requestBuilder.headers.get("apikey")?.trim() ?? "";
  const fromSecurity =
    requestBuilder.security?.find(
      (item) => item.name === "apikey" && item.value?.trim(),
    )?.value?.trim() ?? "";
  const next = [
    apiKeyFromAuth(auth ?? latestAuth),
    fromSecurity,
    fromHeader,
    readDocsApiKey(),
  ].find((value) => value && isDocsApiKey(value));
  if (next) {
    rememberDocsApiKey(next);
    requestBuilder.headers.set("apikey", next);
    return;
  }
  if (fromHeader && !isDocsApiKey(fromHeader)) {
    if (typeof requestBuilder.headers.delete === "function") {
      requestBuilder.headers.delete("apikey");
    } else {
      requestBuilder.headers.set("apikey", "");
    }
  }
}

function nearestAuthScheme(el: Element) {
  const root =
    el.closest("[class*='auth']") ??
    el.closest("[class*='security']") ??
    el.closest(".scalar-card");
  if (!root) {
    return "";
  }
  const selected = root.querySelector(
    '[aria-selected="true"], [data-state="active"], [aria-current="true"]',
  );
  const combo = root.querySelector(
    '[role="combobox"], [aria-haspopup="listbox"]',
  );
  return (selected?.textContent || combo?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function rememberApiKeyFromAuthInput(target: EventTarget | null) {
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    return;
  }
  if (target.closest(".docs-api-server")) {
    return;
  }
  if (!target.closest(".scalar-app, .docs-api-reference, .docs-api-explorer")) {
    return;
  }
  const value = target.value.trim();
  if (!value) {
    return;
  }

  const scheme = nearestAuthScheme(target);
  const selected = scheme.split(/[&|,]/)[0]?.trim() ?? "";
  if (!/^apikey$/i.test(selected)) {
    return;
  }
  rememberDocsApiKey(value);
}

export function createAlwaysSendApiKeyPlugin() {
  return () => ({
    name: "guestbook-always-apikey",
    extensions: [] as const,
    hooks: {
      onInit({ auth }: { auth: ScalarAuthState }) {
        latestAuth = auth;
      },
      onConfigChange({ auth }: { auth: ScalarAuthState }) {
        latestAuth = auth;
      },
      onDestroy() {
        latestAuth = undefined;
      },
    },
    apiClientPlugins: [
      {
        hooks: {
          beforeRequest({
            requestBuilder,
          }: {
            requestBuilder: ScalarRequestBuilder;
          }) {
            applyRememberedApiKey(requestBuilder);
          },
        },
      },
    ],
  });
}
