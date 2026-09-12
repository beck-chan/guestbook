import "server-only";

import { cache } from "react";
import { flags } from "@/lib/flags";
import {
  applyOperationSecurity,
  type OpenApiSpec,
} from "./typesToOpenApi";
import { swagger2ToOpenApi31 } from "./swaggerToOpenApi";
import { envSupabaseProjectRef, publicApiServers } from "./publicApiServers";

const API_KEY_SCHEME = {
  type: "apiKey",
  in: "header",
  name: "apikey",
  description:
    "Supabase anon (publishable) key. Required on every Data API call.",
} as const;

const BEARER_SCHEME = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Supabase user JWT for authenticated admin calls. Anon-callable operations do not require this.",
} as const;

function envOrThrow(name: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing ${name} for docs OpenAPI fetch`);
  }
  return trimmed;
}

function restRoot(url: string) {
  const base = url.replace(/\/+$/, "");
  if (/\/rest\/v1$/i.test(base)) {
    return `${base}/`;
  }
  return `${base}/rest/v1/`;
}

function credentials(isPublic: boolean) {
  if (isPublic) {
    const url = envOrThrow("API_PUBLIC_URL", process.env.API_PUBLIC_URL);
    envOrThrow("API_ANON_KEY", process.env.API_ANON_KEY);
    const key = envOrThrow(
      "API_SERVICE_ROLE_KEY",
      process.env.API_SERVICE_ROLE_KEY,
    );
    return { url, key };
  }

  return {
    url: envOrThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    key: envOrThrow(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  };
}

function applyServers(
  spec: OpenApiSpec,
  servers: { url: string; description?: string }[] | undefined,
) {
  delete spec.host;
  delete spec.basePath;
  delete spec.schemes;
  if (!servers) {
    delete spec.servers;
    return;
  }
  spec.servers = servers;
}

const TAG_DESCRIPTIONS: Record<string, string> = {
  comments:
    "The guestbook comment table. Visitors POST. Admins GET / PATCH / DELETE with a JWT.",
  comments_public:
    "Read-only view of comments table with emails removed. GET with the anon key is the public feed. Do not write this table.",
  guestbook_settings:
    "Single row of guestbook settings (`id = 1`). Anyone may GET. Admins PATCH with a JWT and `id=eq.1`.",
  guestbook_rate_limits: "Internal IP rate-limit buckets.",
  admin_allowlist: "Emails allowed to become admins.",
  poem_hearts:
    "One row per poem heart. This table is not written to directly, only via the heart RPCs.",
  poem_heart_counts: "Per-poem like totals.",
  poem_heart_total: "Sum total of like on all poems.",
  toggle_poem_heart:
    "Adds or removes a visitor’s like on a poem and returns the new counts.",
  poem_heart_state:
    "Whether that visitor has already liked a poem, plus counts.",
  is_admin:
    "Returns whether the current JWT has `app_metadata.role = admin`. Used by RLS — calling it is only a check.",
  ensure_admin_role:
    "After Google login if the email is allow-listed, stamps admin role on the user so the JWT/RLS checks succeed.",
  hook_before_user_created: 'Supabase Auth "before user created" hook.',
  rls_auto_enable:
    "Supabase event-trigger helper — turns on RLS automatically when a new table is created.",
};

function tagDescriptionKey(name: string) {
  return name.trim().toLowerCase().replace(/^\(rpc\)\s+/, "");
}

function collectTagNames(spec: OpenApiSpec) {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (name: string | undefined) => {
    if (!name || seen.has(name)) {
      return;
    }
    seen.add(name);
    names.push(name);
  };
  for (const tag of spec.tags ?? []) {
    add(tag.name);
  }
  for (const methods of Object.values(spec.paths ?? {})) {
    if (!methods) {
      continue;
    }
    for (const operation of Object.values(methods)) {
      if (!operation?.tags) {
        continue;
      }
      for (const name of operation.tags) {
        add(name);
      }
    }
  }
  return names;
}

function applyTagDescriptions(spec: OpenApiSpec) {
  const previous = new Map(
    (spec.tags ?? []).map((tag) => [tag.name, tag] as const),
  );
  spec.tags = collectTagNames(spec).map((name) => {
    const current = previous.get(name) ?? { name };
    const description = TAG_DESCRIPTIONS[tagDescriptionKey(name)];
    return description ? { ...current, name, description } : { ...current, name };
  });
}

/** PostgREST advertises GET / as “OpenAPI description (this document)”. */
function omitPostgrestMeta(spec: OpenApiSpec) {
  if (spec.paths) {
    delete spec.paths["/"];
    delete spec.paths[""];
  }
  if (spec.tags?.length) {
    spec.tags = spec.tags.filter(
      (tag) => tag.name.toLowerCase() !== "introspection",
    );
  }
}

const SERVICE_ROLE_ONLY_PATHS = new Set([
  "/admin_allowlist",
  "/guestbook_rate_limits",
  "/poem_hearts",
  "/rpc/hook_before_user_created",
  "/rpc/rls_auto_enable",
]);

const JWT_ERROR_HEADING =
  "This call will return an error even with your valid JWT.<br><br>";

/** Scalar has no MDX `::: {.callout}`; a blockquote + h3 matches docs callouts. */
function markdownCallout(title: string, body: string) {
  return `> ### ${title}\n>\n> ${body}`;
}

const SERVICE_ROLE_ONLY_CALLOUT = markdownCallout(
  JWT_ERROR_HEADING,
  "Your admin session token is the Postgres `authenticated` role, but permission for this call is granted only to `service_role` — Supabase does not allow you to paste in your `service_role` key into a browser and will only return the error `42501`.",
);

const COMMENTS_PUBLIC_WRITE_CALLOUT = markdownCallout(
  JWT_ERROR_HEADING,
  "`comments_public` is a read-only view of the guestbook (emails omitted). The catalog still lists write methods, but they are not granted, so Test Request returns `42501`. Use **GET** on this path with your anon key. To insert, update, or delete a comment, call `/comments` instead.",
);

const SETTINGS_CREATE_DELETE_CALLOUT = markdownCallout(
  JWT_ERROR_HEADING,
  "There is a single settings row. **GET** works with the anon key, and **PATCH** works with your admin JWT. Create and delete are not granted, so those Test Requests return `42501`.",
);

const SETTINGS_PATCH_CALLOUT = markdownCallout(
  "This call needs a filter, even with a valid JWT.",
  "PostgREST will not run an unfiltered `UPDATE` (`21000`). Settings is a single row with `id = 1`. In Test Request **Query**, set **Key** `id` and **Value** `eq.1` (not `1`). Keep `bearerAuth` plus the `apikey` header, and put the fields to change in the JSON body.",
);

const COMMENTS_POST_CALLOUT = markdownCallout(
  "Delete the generated fields from Scalar’s example body.",
  "Test Request pre-fills `id`, `created_at`, and `updated_at` with SQL like `gen_random_uuid()` and `now()`. Those are strings, not functions, so Postgres returns `22P02`. Remove those keys (and `is_read`). Send only `display_name`, `body`, and `email` if you capture email.",
);

const COMMENTS_DELETE_CALLOUT = markdownCallout(
  "This call needs a filter, even with a valid JWT.",
  "PostgREST will not run an unfiltered `DELETE` (`21000`). In Test Request **Query**, set **Key** `id` and **Value** `eq.<comment-uuid>` (not the uuid alone). Copy the id from **GET /comments**. Keep `bearerAuth` plus the `apikey` header.",
);

const COMMENTS_PATCH_CALLOUT = markdownCallout(
  "This call needs a filter, even with a valid JWT.",
  "PostgREST will not run an unfiltered `UPDATE` (`21000`). In Test Request **Query**, set **Key** `id` and **Value** `eq.<comment-uuid>` (not the uuid alone). Copy the id from **GET /comments**. Keep `bearerAuth` plus the `apikey` header, and put the fields to change in the JSON body.",
);

const OPERATION_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "patch",
]);

function prependCallout(
  spec: OpenApiSpec,
  path: string,
  methods: string[],
  callout: string,
) {
  const item = spec.paths?.[path];
  if (!item) {
    return;
  }
  for (const method of methods) {
    const operation = item[method];
    if (!operation || !OPERATION_METHODS.has(method)) {
      continue;
    }
    const existing = operation.description?.trim();
    operation.description = existing ? `${callout}\n\n${existing}` : callout;
  }
}

function applyPublicOperationCallouts(spec: OpenApiSpec) {
  for (const path of SERVICE_ROLE_ONLY_PATHS) {
    prependCallout(
      spec,
      path,
      [...OPERATION_METHODS],
      SERVICE_ROLE_ONLY_CALLOUT,
    );
  }
  prependCallout(
    spec,
    "/comments_public",
    ["post", "patch", "delete"],
    COMMENTS_PUBLIC_WRITE_CALLOUT,
  );
  prependCallout(
    spec,
    "/guestbook_settings",
    ["post", "delete"],
    SETTINGS_CREATE_DELETE_CALLOUT,
  );
  prependCallout(
    spec,
    "/guestbook_settings",
    ["patch"],
    SETTINGS_PATCH_CALLOUT,
  );
  prependCallout(spec, "/comments", ["post"], COMMENTS_POST_CALLOUT);
  prependCallout(spec, "/comments", ["delete"], COMMENTS_DELETE_CALLOUT);
  prependCallout(spec, "/comments", ["patch"], COMMENTS_PATCH_CALLOUT);
}

function overlayInfo(spec: OpenApiSpec, isPublic: boolean) {
  spec.info = {
    ...spec.info,
    title: isPublic ? "y2k Guestbook API" : "Beck's y2k Guestbook API",
    version: spec.info?.version ?? "1.0.0",
    description: isPublic
      ? "### The API below reflects the calls you can make to your connected Supabase database when the guestbook is fully installed.<br></br>\n\n> To hook up the Test Request functionality to your instance of Supabase, you'll need to [enter your Project ID above](#enter-supabase-connection-details). Under **Authentication**, set **Auth Type** `apikey` to your `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and for admin calls also set `bearerAuth` to [your admin JWT](#your-supabase-tokens).\n\n<br>Project IDs and keys you enter on this page when testing requests stay in your browser — we do not collect them. Send goes from your browser direct to your Supabase project."
      : flags.apiTest
        ? "### The API below reflects the functionality of Beck's custom guestbook install.<br></br>\n\n> Testing functionality is turned on, and uses this project's Supabase URL from the environment."
        : "### The API below reflects the functionality of Beck's custom guestbook install.\n\n<br>You cannot enter API keys or project IDs for testing.<br>\n\n> [View Public API Library](https://y2k-guestbook.vercel.app/docs/api)",
  };
}

async function fetchOpenApi(isPublic: boolean): Promise<OpenApiSpec> {
  const { url, key } = credentials(isPublic);
  const response = await fetch(restRoot(url), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(
      `OpenAPI fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const spec = (await response.json()) as OpenApiSpec;
  if (!spec || typeof spec !== "object" || !spec.paths) {
    throw new Error("OpenAPI fetch returned no paths");
  }

  const normalized = swagger2ToOpenApi31(
    spec as Record<string, unknown>,
  ) as OpenApiSpec;
  omitPostgrestMeta(normalized);
  applyTagDescriptions(normalized);
  overlayInfo(normalized, isPublic);
  if (isPublic) {
    applyPublicOperationCallouts(normalized);
  }
  normalized.components = normalized.components ?? {};
  normalized.components.securitySchemes = {
    ...normalized.components.securitySchemes,
    apikey: API_KEY_SCHEME,
    bearerAuth: BEARER_SCHEME,
  };
  delete normalized.securityDefinitions;
  applyOperationSecurity(normalized.paths);

  if (isPublic) {
    applyServers(normalized, publicApiServers());
  } else if (flags.apiTest) {
    applyServers(normalized, publicApiServers(envSupabaseProjectRef()));
  } else {
    applyServers(normalized, undefined);
  }

  return normalized;
}

export const loadDatabaseOpenApi = cache(
  async (isPublic = flags.public): Promise<OpenApiSpec> => fetchOpenApi(isPublic),
);

export async function loadDatabaseOpenApiOrNull() {
  try {
    return { spec: await loadDatabaseOpenApi() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAPI fetch failed";
    console.error("[docs] OpenAPI catalog unavailable:", message);
    return { spec: null, error: message };
  }
}
