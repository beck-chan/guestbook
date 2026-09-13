import {
  DEFAULT_PROJECT_REF,
  PROJECT_REF_KEY,
  envSupabaseProjectRef,
  parseProjectRef,
} from "./publicApiServers";

const API_KEY_STORE = "guestbook-docs-api-apikey";
const BEARER_STORE = "guestbook-docs-api-bearer";

type SecurityItem = {
  in?: string;
  name?: string;
  value?: string;
  format?: string;
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
    return JSON.parse(atob(b64)) as { role?: string; ref?: string; iss?: string };
  } catch {
    return null;
  }
}

function jwtProjectRef(payload: { ref?: string; iss?: string } | null) {
  if (!payload) {
    return "";
  }
  if (payload.ref) {
    return parseProjectRef(payload.ref);
  }
  if (payload.iss) {
    return parseProjectRef(payload.iss);
  }
  return "";
}

function currentProjectRef() {
  try {
    const stored = parseProjectRef(sessionStorage.getItem(PROJECT_REF_KEY) ?? "");
    if (stored && stored !== DEFAULT_PROJECT_REF) {
      return stored;
    }
  } catch {
    /* private mode */
  }
  const envRef = envSupabaseProjectRef();
  return envRef === DEFAULT_PROJECT_REF ? "" : envRef;
}

function splitHeaderValues(value: string) {
  return value
    .split(/,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripBearer(value: string) {
  return value.replace(/^Bearer\s+/i, "").trim();
}

function jwtMatchesProject(
  payload: { ref?: string; iss?: string } | null,
  projectRef: string,
) {
  const target =
    projectRef && projectRef !== DEFAULT_PROJECT_REF
      ? projectRef.toLowerCase()
      : "";
  const keyRef = jwtProjectRef(payload);
  return !(target && keyRef && keyRef !== target);
}

/** Anon / publishable keys only — never a user session JWT. */
export function isDocsApiKey(value: string, projectRef = "") {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^sb_publishable_/i.test(trimmed)) {
    return true;
  }
  const payload = jwtPayload(trimmed);
  const role = payload?.role;
  if (role !== "anon" && role !== "service_role") {
    return false;
  }
  return jwtMatchesProject(payload, projectRef);
}

/** Admin session JWT only — never the anon key or service_role. */
export function isDocsBearer(value: string, projectRef = "") {
  const token = stripBearer(value);
  if (!token) {
    return false;
  }
  const payload = jwtPayload(token);
  if (payload?.role !== "authenticated") {
    return false;
  }
  return jwtMatchesProject(payload, projectRef);
}

function secretToken(secrets: PluginAuthSecrets | undefined) {
  if (!secrets) {
    return "";
  }
  return (
    trimSecret(secrets.value) ||
    trimSecret(secrets.token) ||
    trimSecret(secrets["x-scalar-secret-token"]) ||
    trimSecret(secrets.apiKey)
  );
}

function secretApiKey(secrets: PluginAuthSecrets | undefined, projectRef = "") {
  const next = secretToken(secrets);
  return isDocsApiKey(next, projectRef) ? next : "";
}

function secretBearer(secrets: PluginAuthSecrets | undefined, projectRef = "") {
  const next = stripBearer(secretToken(secrets));
  return isDocsBearer(next, projectRef) ? next : "";
}

function readStoreMap(store: string) {
  try {
    const raw = sessionStorage.getItem(store);
    if (!raw) {
      return {} as Record<string, string>;
    }
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const map: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string") {
            map[key] = value;
          }
        }
        return map;
      }
    }
    return { "": raw } as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

function writeStoreMap(store: string, map: Record<string, string>) {
  try {
    sessionStorage.setItem(store, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

function rememberStoreValue(
  store: string,
  value: string,
  projectRef: string,
  accept: (next: string, ref: string) => boolean,
) {
  const trimmed = value.trim();
  if (!projectRef || projectRef === DEFAULT_PROJECT_REF) {
    return;
  }
  if (!accept(trimmed, projectRef)) {
    return;
  }
  const map = readStoreMap(store);
  delete map[""];
  map[projectRef] = trimmed;
  writeStoreMap(store, map);
}

function readStoreValue(
  store: string,
  projectRef: string,
  accept: (next: string, ref: string) => boolean,
) {
  if (!projectRef || projectRef === DEFAULT_PROJECT_REF) {
    return "";
  }
  try {
    const stored = readStoreMap(store)[projectRef]?.trim() ?? "";
    return accept(stored, projectRef) ? stored : "";
  } catch {
    return "";
  }
}

export function rememberDocsApiKey(value: string, projectRef = currentProjectRef()) {
  rememberStoreValue(API_KEY_STORE, value, projectRef, isDocsApiKey);
}

export function readDocsApiKey(projectRef = currentProjectRef()) {
  return readStoreValue(API_KEY_STORE, projectRef, isDocsApiKey);
}

export function rememberDocsBearer(value: string, projectRef = currentProjectRef()) {
  rememberStoreValue(BEARER_STORE, stripBearer(value), projectRef, isDocsBearer);
}

export function readDocsBearer(projectRef = currentProjectRef()) {
  return readStoreValue(BEARER_STORE, projectRef, isDocsBearer);
}

export function apiKeyFromAuth(auth?: ScalarAuthState, projectRef = "") {
  if (!auth) {
    return "";
  }
  try {
    for (const doc of Object.values(auth.export())) {
      const named = secretApiKey(doc.secrets?.apikey, projectRef);
      if (named) {
        return named;
      }
      for (const [name, secrets] of Object.entries(doc.secrets ?? {})) {
        if (!/apikey/i.test(name)) {
          continue;
        }
        const next = secretApiKey(secrets, projectRef);
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

export function bearerFromAuth(auth?: ScalarAuthState, projectRef = "") {
  if (!auth) {
    return "";
  }
  try {
    for (const doc of Object.values(auth.export())) {
      const named = secretBearer(doc.secrets?.bearerAuth, projectRef);
      if (named) {
        return named;
      }
      for (const [name, secrets] of Object.entries(doc.secrets ?? {})) {
        if (!/bearer/i.test(name) || /apikey/i.test(name)) {
          continue;
        }
        const next = secretBearer(secrets, projectRef);
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

function authorizationTokens(headers: ScalarRequestBuilder["headers"]) {
  return splitHeaderValues(
    headers.get("Authorization") ?? headers.get("authorization") ?? "",
  ).map(stripBearer);
}

function securityBearerTokens(security: SecurityItem[] | undefined) {
  const tokens: string[] = [];
  for (const item of security ?? []) {
    const name = item.name ?? "";
    if (name === "apikey") {
      continue;
    }
    if (!/^authorization$/i.test(name) && item.format !== "bearer") {
      continue;
    }
    const token = stripBearer(item.value ?? "");
    if (token) {
      tokens.push(token);
    }
  }
  return tokens;
}

let latestAuth: ScalarAuthState | undefined;

export function applyRememberedApiKey(
  requestBuilder: ScalarRequestBuilder,
  auth?: ScalarAuthState,
  outgoing?: Request,
) {
  const projectRef =
    (outgoing?.url ? parseProjectRef(outgoing.url) : "") || currentProjectRef();
  const fromOutgoing = outgoing
    ? splitHeaderValues(outgoing.headers.get("apikey") ?? "")
    : [];
  const fromHeader = splitHeaderValues(
    requestBuilder.headers.get("apikey") ?? "",
  );
  const fromSecurity = (requestBuilder.security ?? [])
    .filter((item) => item.name === "apikey")
    .map((item) => item.value?.trim() ?? "")
    .filter(Boolean);
  const next = [
    ...fromOutgoing,
    ...fromHeader,
    ...fromSecurity,
    apiKeyFromAuth(auth ?? latestAuth, projectRef),
    readDocsApiKey(projectRef),
  ].find((value) => value && isDocsApiKey(value, projectRef));

  const write = (headers: ScalarRequestBuilder["headers"]) => {
    if (next) {
      headers.set("apikey", next);
      return;
    }
    if (typeof headers.delete === "function") {
      headers.delete("apikey");
    } else {
      headers.set("apikey", "");
    }
  };

  if (next) {
    rememberDocsApiKey(next, projectRef);
  }
  write(requestBuilder.headers);
  if (outgoing) {
    write(outgoing.headers);
  }
}

export function applyRememberedBearer(
  requestBuilder: ScalarRequestBuilder,
  auth?: ScalarAuthState,
  outgoing?: Request,
) {
  const projectRef =
    (outgoing?.url ? parseProjectRef(outgoing.url) : "") || currentProjectRef();
  const next = [
    ...(outgoing ? authorizationTokens(outgoing.headers) : []),
    ...authorizationTokens(requestBuilder.headers),
    ...securityBearerTokens(requestBuilder.security),
    bearerFromAuth(auth ?? latestAuth, projectRef),
    readDocsBearer(projectRef),
  ].find((value) => value && isDocsBearer(value, projectRef));

  if (!next) {
    return;
  }

  rememberDocsBearer(next, projectRef);
  const header = `Bearer ${stripBearer(next)}`;
  requestBuilder.headers.set("Authorization", header);
  outgoing?.headers.set("Authorization", header);
}

export function applyRememberedAuth(
  requestBuilder: ScalarRequestBuilder,
  auth?: ScalarAuthState,
  outgoing?: Request,
) {
  applyRememberedApiKey(requestBuilder, auth, outgoing);
  applyRememberedBearer(requestBuilder, auth, outgoing);
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
  if (/^apikey$/i.test(selected)) {
    rememberDocsApiKey(value);
    return;
  }
  if (/bearer/i.test(selected)) {
    rememberDocsBearer(value);
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
            applyRememberedAuth(requestBuilder);
          },
        },
      },
    ],
  });
}
