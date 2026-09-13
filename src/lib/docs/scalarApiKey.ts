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

function secretApiKey(secrets: PluginAuthSecrets | undefined) {
  if (!secrets) {
    return "";
  }
  return (
    trimSecret(secrets.value) ||
    trimSecret(secrets.token) ||
    trimSecret(secrets.apiKey)
  );
}

export function rememberDocsApiKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
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
    return sessionStorage.getItem(API_KEY_STORE)?.trim() ?? "";
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
  const next =
    fromHeader ||
    fromSecurity ||
    apiKeyFromAuth(auth ?? latestAuth) ||
    readDocsApiKey();
  if (!next) {
    return;
  }
  rememberDocsApiKey(next);
  requestBuilder.headers.set("apikey", next);
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
  if (/\bbearerAuth\b/i.test(scheme) && !/\bapikey\b/i.test(scheme)) {
    return;
  }
  if (/\bapikey\b/i.test(scheme)) {
    rememberDocsApiKey(value);
    return;
  }

  const hint = [
    target.name,
    target.id,
    target.getAttribute("aria-label"),
    target.placeholder,
    target.closest("label")?.textContent,
  ]
    .filter(Boolean)
    .join(" ");
  if (/\bapikey\b/i.test(hint) && !/bearer/i.test(hint)) {
    rememberDocsApiKey(value);
  }
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
