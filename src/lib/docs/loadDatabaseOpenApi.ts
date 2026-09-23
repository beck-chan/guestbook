import "server-only";

import { cache } from "react";
import { flags } from "@/lib/flags";
import {
  applyOperationSecurity,
  type OpenApiOperation,
  type OpenApiParameter,
  type OpenApiSpec,
} from "./typesToOpenApi";
import { swagger2ToOpenApi31 } from "./swaggerToOpenApi";
import {
  HIDDEN_LIBRARY_PATHS,
  isDocsCatalogPath,
  isHiddenLibraryTag,
} from "./hiddenApiCatalog";
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

function overlayCommentsWriteBodies(spec: OpenApiSpec) {
  const example = {
    display_name: "Your Name",
    body: "Comment made via the API reference explorer.",
    email: "you@example.com",
  };
  const jsonContent = {
    schema: {
      type: "object" as const,
      properties: {
        display_name: { type: "string" as const },
        body: { type: "string" as const },
        email: { type: "string" as const },
      },
    },
    example,
    examples: {
      comment: {
        summary: "Sign the guestbook",
        value: example,
      },
    },
  };
  const post = spec.paths?.["/comments"]?.post;
  if (post) {
    post.requestBody = {
      required: true,
      content: {
        "application/json": {
          ...jsonContent,
          schema: {
            ...jsonContent.schema,
            required: ["display_name", "body"],
          },
        },
      },
    };
  }
  const patch = spec.paths?.["/comments"]?.patch;
  if (patch) {
    patch.requestBody = {
      required: false,
      content: {
        "application/json": { ...jsonContent },
      },
    };
  }
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

const BOT_TAG_DESCRIPTIONS: Record<string, string> = {
  docs_section:
    "MDX chunks and embeddings synced from the repo. Chat reads this table through the search RPCs. `service_role` only.",
  docs_query_embedding:
    "Cache of question embeddings. The row `id` is a hash of the question, so the question text is not stored. `service_role` only.",
  docs_chat_session:
    "One conversation. Cookie `docs_chat_id` stores the row `id`. The browser never queries this table.",
  docs_chat_message:
    "One turn in that conversation (role, content, and sources on replies). Deleting a session deletes its messages.",
  docs_chat_limits:
    "Chat IP quotas, one row per hashed window (`key`, `points`, `expire`). Five questions per hour and ten per day, written through `DATABASE_URL`.",
  search_docs_sections: "Wording match on `docs_section.search_vector`.",
  match_docs_sections:
    "Meaning match on `docs_section` embeddings (cosine distance).",
};

function applyTagDescriptions(
  spec: OpenApiSpec,
  descriptions: Record<string, string> = TAG_DESCRIPTIONS,
) {
  const previous = new Map(
    (spec.tags ?? []).map((tag) => [tag.name, tag] as const),
  );
  spec.tags = collectTagNames(spec).map((name) => {
    const current = previous.get(name) ?? { name };
    const description = descriptions[tagDescriptionKey(name)];
    return description ? { ...current, name, description } : { ...current, name };
  });
}

/** PostgREST advertises GET / as “OpenAPI description (this document)”. */
function omitPostgrestMeta(spec: OpenApiSpec) {
  if (spec.paths) {
    delete spec.paths["/"];
    delete spec.paths[""];
    for (const path of HIDDEN_LIBRARY_PATHS) {
      delete spec.paths[path];
    }
  }
  if (spec.tags?.length) {
    spec.tags = spec.tags.filter((tag) => !isHiddenLibraryTag(tag.name));
  }
}

/** Move docs chatbot paths into their own spec. No guestbook callouts or auth overlay. */
function extractDocsCatalog(spec: OpenApiSpec): OpenApiSpec {
  const paths: NonNullable<OpenApiSpec["paths"]> = {};
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    if (!methods || !isDocsCatalogPath(path)) {
      continue;
    }
    paths[path] = structuredClone(methods);
    delete spec.paths?.[path];
  }
  const bot: OpenApiSpec = {
    openapi: spec.openapi ?? "3.1.0",
    info: {
      title: "Docs chat",
      version: spec.info?.version ?? "1.0.0",
    },
    paths,
    components: spec.components ? structuredClone(spec.components) : undefined,
  };
  applyTagDescriptions(bot, BOT_TAG_DESCRIPTIONS);
  return bot;
}

const SERVICE_ROLE_ONLY_PATHS = new Set([
  "/admin_allowlist",
  "/guestbook_rate_limits",
  "/poem_hearts",
]);

const JWT_ERROR_HEADING =
  "This sample call will return an error even with your valid JWT.";
const FILTER_CALLOUT_TITLE = "This call needs a filter, even with a valid JWT.";
const FILTER_AND_AUTH_HEADING =
  "This call requires a filter, and will still return an error even with your valid JWT.";

/** Scalar has no MDX `::: {.callout}`; a blockquote + h3 matches docs callouts. */
function markdownCallout(title: string, ...paragraphs: string[]) {
  const lines = [`> ### ${title}`, ">"];
  for (const [index, paragraph] of paragraphs.entries()) {
    if (index > 0) {
      lines.push(">");
    }
    for (const line of paragraph.split("\n")) {
      lines.push(line ? `> ${line}` : ">");
    }
  }
  return lines.join("\n");
}

const SERVICE_ROLE_AUTH_BODY =
  "Your admin session token is the Postgres `authenticated` role, but permission for this call is granted only to `service_role` — Supabase does not allow you to paste in your `service_role` key into a browser and will only return the error `42501`.";

const SETTINGS_GRANT_BODY =
  "There is a single settings row. **GET** works with the anon key, and **PATCH** works with your admin JWT. Create and delete are not granted, so those Test Requests return `42501`.";

const SERVICE_ROLE_ONLY_CALLOUT = markdownCallout(
  JWT_ERROR_HEADING,
  SERVICE_ROLE_AUTH_BODY,
);

const COMMENTS_PUBLIC_WRITE_BODY =
  "`comments_public` is a read-only view of the guestbook (emails omitted). The catalog still lists write methods, but they are not granted, so Test Request returns `42501`. Use **GET** on this path with your anon key. To insert, update, or delete a comment, call `/comments` instead.";

const COMMENTS_PUBLIC_WRITE_CALLOUT = markdownCallout(
  JWT_ERROR_HEADING,
  COMMENTS_PUBLIC_WRITE_BODY,
);

const SETTINGS_CREATE_DELETE_CALLOUT = markdownCallout(
  JWT_ERROR_HEADING,
  SETTINGS_GRANT_BODY,
);

type MutationFilterOpts = {
  key: string;
  value: string;
  notAlone: string;
  retrieveFrom?: string;
  intro?: string;
  keepAuth?: boolean;
};

function mutationFilterBody(
  kind: "DELETE" | "UPDATE",
  opts: MutationFilterOpts,
) {
  const verb = kind === "DELETE" ? "`DELETE`" : "`UPDATE`";
  const intro = opts.intro ? `${opts.intro} ` : "";
  const retrieve = opts.retrieveFrom
    ? ` Retrieve the ${opts.retrieveFrom}.`
    : "";
  const authHint = opts.keepAuth
    ? " Keep `bearerAuth` plus the `apikey` header."
    : "";
  const updateHint = kind === "UPDATE"
    ? opts.keepAuth
      ? ", and put the fields to change in the JSON body."
      : " Put the fields to change in the JSON body."
    : "";
  return `PostgREST will not run an unfiltered ${verb} (\`21000\`). ${intro}Under **Query Parameters**, set **key**: \`${opts.key}\` and **value**: \`${opts.value}\` (${opts.notAlone}).${retrieve}${authHint}${updateHint}`;
}

function mutationFilterCallout(
  kind: "DELETE" | "UPDATE",
  opts: MutationFilterOpts,
) {
  return markdownCallout(FILTER_CALLOUT_TITLE, mutationFilterBody(kind, opts));
}

function mutationFilterAndAuthCallout(
  kind: "DELETE" | "UPDATE",
  opts: MutationFilterOpts,
  authBody: string,
) {
  return markdownCallout(
    FILTER_AND_AUTH_HEADING,
    mutationFilterBody(kind, opts),
    authBody,
  );
}

const SETTINGS_FILTER = {
  key: "id",
  value: "eq.1",
  notAlone: "not `1`",
  intro: "Settings is a single row with `id = 1`.",
} as const;

const SETTINGS_PATCH_CALLOUT = mutationFilterCallout("UPDATE", {
  ...SETTINGS_FILTER,
  keepAuth: true,
});
const SETTINGS_DELETE_CALLOUT = mutationFilterAndAuthCallout(
  "DELETE",
  SETTINGS_FILTER,
  SETTINGS_GRANT_BODY,
);

const ADMIN_ALLOWLIST_FILTER = {
  key: "email",
  value: "eq.you@example.com",
  notAlone: "not the email alone",
  retrieveFrom: "email from **GET** `/admin_allowlist`",
} as const;

const RATE_LIMITS_FILTER = {
  key: "key",
  value: "eq.<rate-limit-key>",
  notAlone: "not the key alone",
  retrieveFrom: "key from **GET** `/guestbook_rate_limits`",
} as const;

const POEM_HEARTS_FILTER = {
  key: "id",
  value: "eq.<heart-uuid>",
  notAlone: "not the uuid alone",
  retrieveFrom: "id from **GET** `/poem_hearts`",
} as const;

const COMMENTS_FILTER = {
  key: "id",
  value: "eq.<comment-uuid>",
  notAlone: "not the uuid alone",
  retrieveFrom: "id from **GET** `/comments`",
  keepAuth: true,
} as const;

const COMMENTS_PUBLIC_FILTER = {
  key: "id",
  value: "eq.<comment-uuid>",
  notAlone: "not the uuid alone",
  retrieveFrom: "id from **GET** `/comments_public`",
} as const;

const COMMENTS_POST_CALLOUT = markdownCallout(
  "This call needs the generated fields removed from Scalar’s example body.",
  "Postgres will not accept SQL defaults as JSON (`22P02`). Under **Request Body**, remove `id`, `created_at`, `updated_at`, and `is_read`. Scalar pre-fills those with strings like `gen_random_uuid()` and `now()`, not functions. Send only `display_name`, `body`, and `email` if you capture email.",
  "```json\n{\n  \"display_name\": \"Your Name\",\n  \"body\": \"Comment made via the API reference explorer.\",\n  \"email\": \"you@example.com\"\n}\n```",
);

const COMMENTS_DELETE_CALLOUT = mutationFilterCallout(
  "DELETE",
  COMMENTS_FILTER,
);
const COMMENTS_PATCH_CALLOUT = markdownCallout(
  FILTER_CALLOUT_TITLE,
  "PostgREST will not run an unfiltered `UPDATE` (`21000`). Under **Query Parameters**, set **key**: `id` and **value**: `eq.<comment-uuid>` (not the uuid alone). Retrieve the id from **GET** `/comments`. Keep `bearerAuth` plus the `apikey` header.",
  "Under **Request Body**, send only the columns to change — do not include `id`:",
  "```json\n{\n  \"display_name\": \"Your Name\",\n  \"body\": \"Comment made via the API reference explorer.\",\n  \"email\": \"you@example.com\"\n}\n```",
);

const POEM_HEART_RPC_CALLOUT = markdownCallout(
  "This call needs `p_poem_id` in the request body.",
  "The RPC raises `P0001` (`poem_id required`) if `p_poem_id` is missing or blank. Under **Request Body**, send the Postgres argument names (not `poem_id`):",
  "```json\n{\n  \"p_poem_id\": \"<poem-id>\",\n  \"p_visitor_key\": \"<visitor-uuid>\"\n}\n```",
  "`toggle_poem_heart` also requires `p_visitor_key`. `poem_heart_state` can omit it (liked will be false). Use any poem id from the desk and any uuid as the visitor key.",
);

const FILTER_AND_AUTH_PATHS = new Set([
  "/admin_allowlist",
  "/guestbook_rate_limits",
  "/poem_hearts",
]);

const OPERATION_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "patch",
]);

function queryFilterParamKey(item: OpenApiParameter) {
  if (item.name && item.in !== "header" && item.in !== "path") {
    return item.name;
  }
  if (!item.$ref) {
    return null;
  }
  const refName = item.$ref.split("/").pop() ?? "";
  return refName.split(".").pop() || null;
}

function upsertQueryFilter(
  operation: OpenApiOperation,
  opts: { key: string; value: string },
) {
  const concrete = !opts.value.includes("<");
  const parameter: OpenApiParameter = {
    name: opts.key,
    in: "query",
    required: true,
    description: `Row filter. Use PostgREST \`eq\` syntax, for example \`${opts.value}\`.`,
    example: opts.value,
    schema: {
      type: "string",
      example: opts.value,
      ...(concrete ? { default: opts.value } : {}),
    },
  };
  const parameters = (operation.parameters ?? []).filter(
    (item) => queryFilterParamKey(item) !== opts.key,
  );
  parameters.unshift(parameter);
  operation.parameters = parameters;
}

function overlayMutationQueryFilters(spec: OpenApiSpec) {
  const filters: {
    path: string;
    methods: string[];
    filter: { key: string; value: string };
  }[] = [
    { path: "/comments", methods: ["patch", "delete"], filter: COMMENTS_FILTER },
    {
      path: "/comments_public",
      methods: ["patch", "delete"],
      filter: COMMENTS_PUBLIC_FILTER,
    },
    {
      path: "/guestbook_settings",
      methods: ["patch", "delete"],
      filter: SETTINGS_FILTER,
    },
    {
      path: "/admin_allowlist",
      methods: ["patch", "delete"],
      filter: ADMIN_ALLOWLIST_FILTER,
    },
    {
      path: "/guestbook_rate_limits",
      methods: ["patch", "delete"],
      filter: RATE_LIMITS_FILTER,
    },
    { path: "/poem_hearts", methods: ["patch", "delete"], filter: POEM_HEARTS_FILTER },
  ];
  for (const { path, methods, filter } of filters) {
    const item = spec.paths?.[path];
    if (!item) {
      continue;
    }
    for (const method of methods) {
      const operation = item[method];
      if (!operation || !OPERATION_METHODS.has(method)) {
        continue;
      }
      upsertQueryFilter(operation, filter);
    }
  }
}

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

function applyOperationCallouts(spec: OpenApiSpec) {
  for (const path of SERVICE_ROLE_ONLY_PATHS) {
    prependCallout(
      spec,
      path,
      FILTER_AND_AUTH_PATHS.has(path)
        ? ["get", "put", "post"]
        : [...OPERATION_METHODS],
      SERVICE_ROLE_ONLY_CALLOUT,
    );
  }
  prependCallout(
    spec,
    "/comments_public",
    ["post"],
    COMMENTS_PUBLIC_WRITE_CALLOUT,
  );
  prependCallout(
    spec,
    "/comments_public",
    ["delete"],
    mutationFilterAndAuthCallout(
      "DELETE",
      COMMENTS_PUBLIC_FILTER,
      COMMENTS_PUBLIC_WRITE_BODY,
    ),
  );
  prependCallout(
    spec,
    "/comments_public",
    ["patch"],
    mutationFilterAndAuthCallout(
      "UPDATE",
      COMMENTS_PUBLIC_FILTER,
      COMMENTS_PUBLIC_WRITE_BODY,
    ),
  );
  prependCallout(
    spec,
    "/guestbook_settings",
    ["post"],
    SETTINGS_CREATE_DELETE_CALLOUT,
  );
  prependCallout(
    spec,
    "/guestbook_settings",
    ["patch"],
    SETTINGS_PATCH_CALLOUT,
  );
  prependCallout(
    spec,
    "/guestbook_settings",
    ["delete"],
    SETTINGS_DELETE_CALLOUT,
  );
  prependCallout(
    spec,
    "/admin_allowlist",
    ["delete"],
    mutationFilterAndAuthCallout(
      "DELETE",
      ADMIN_ALLOWLIST_FILTER,
      SERVICE_ROLE_AUTH_BODY,
    ),
  );
  prependCallout(
    spec,
    "/admin_allowlist",
    ["patch"],
    mutationFilterAndAuthCallout(
      "UPDATE",
      ADMIN_ALLOWLIST_FILTER,
      SERVICE_ROLE_AUTH_BODY,
    ),
  );
  prependCallout(
    spec,
    "/guestbook_rate_limits",
    ["delete"],
    mutationFilterAndAuthCallout(
      "DELETE",
      RATE_LIMITS_FILTER,
      SERVICE_ROLE_AUTH_BODY,
    ),
  );
  prependCallout(
    spec,
    "/guestbook_rate_limits",
    ["patch"],
    mutationFilterAndAuthCallout(
      "UPDATE",
      RATE_LIMITS_FILTER,
      SERVICE_ROLE_AUTH_BODY,
    ),
  );
  prependCallout(
    spec,
    "/poem_hearts",
    ["delete"],
    mutationFilterAndAuthCallout(
      "DELETE",
      POEM_HEARTS_FILTER,
      SERVICE_ROLE_AUTH_BODY,
    ),
  );
  prependCallout(
    spec,
    "/poem_hearts",
    ["patch"],
    mutationFilterAndAuthCallout(
      "UPDATE",
      POEM_HEARTS_FILTER,
      SERVICE_ROLE_AUTH_BODY,
    ),
  );
  prependCallout(spec, "/comments", ["post"], COMMENTS_POST_CALLOUT);
  prependCallout(spec, "/comments", ["delete"], COMMENTS_DELETE_CALLOUT);
  prependCallout(spec, "/comments", ["patch"], COMMENTS_PATCH_CALLOUT);
  prependCallout(
    spec,
    "/rpc/poem_heart_state",
    ["post"],
    POEM_HEART_RPC_CALLOUT,
  );
  prependCallout(
    spec,
    "/rpc/toggle_poem_heart",
    ["post"],
    POEM_HEART_RPC_CALLOUT,
  );
}

function overlayInfo(spec: OpenApiSpec, isPublic: boolean) {
  spec.info = {
    ...spec.info,
    title: isPublic ? "y2k Guestbook API" : "Beck's y2k Guestbook API",
    version: spec.info?.version ?? "1.0.0",
    description: isPublic
      ? "### The reference below reflects the calls you can make to your connected Supabase database when the guestbook is fully installed.\n\n1. To hook up the Test Request functionality to your instance of Supabase, you'll need to first [enter your Project ID above](#enter-supabase-connection-details).\n2. Then, under **Authentication**, set `apikey` to your `NEXT_PUBLIC_SUPABASE_ANON_KEY`. For admin calls also set `bearerAuth` to [your admin JWT](#your-supabase-tokens).\n\n> Project IDs and keys you enter on this page when testing requests stay in your browser — we do not collect them. Send goes from your browser direct to your Supabase project."
      : flags.apiTest
        ? "### The reference below reflects the functionality of Beck's custom guestbook install.\n\n> Testing functionality is turned on, and uses this project's Supabase URL from the environment."
        : "### The reference below reflects the functionality of Beck's custom guestbook install.\n\nYou cannot enter API keys or project IDs for testing.<br>\n\n> [View Public API Library](https://y2k-guestbook.vercel.app/docs/api)",
  };
}

async function fetchOpenApiPair(isPublic: boolean): Promise<{
  library: OpenApiSpec;
  bot: OpenApiSpec;
}> {
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
  const bot = extractDocsCatalog(normalized);
  omitPostgrestMeta(normalized);
  applyTagDescriptions(normalized);
  overlayInfo(normalized, isPublic);
  applyOperationCallouts(normalized);
  overlayCommentsWriteBodies(normalized);
  overlayMutationQueryFilters(normalized);
  normalized.components = normalized.components ?? {};
  normalized.components.securitySchemes = {
    ...normalized.components.securitySchemes,
    apikey: API_KEY_SCHEME,
    bearerAuth: BEARER_SCHEME,
  };
  delete normalized.securityDefinitions;
  normalized.security = [{ apikey: [] }];
  applyOperationSecurity(normalized.paths);

  if (isPublic) {
    applyServers(normalized, undefined);
  } else if (flags.apiTest) {
    applyServers(normalized, publicApiServers(envSupabaseProjectRef()));
  } else {
    applyServers(normalized, undefined);
  }

  return { library: normalized, bot };
}

const loadOpenApiPair = cache(fetchOpenApiPair);

export const loadDatabaseOpenApi = cache(
  async (isPublic = flags.public): Promise<OpenApiSpec> =>
    (await loadOpenApiPair(isPublic)).library,
);

export const loadBotOpenApi = cache(
  async (isPublic = flags.public): Promise<OpenApiSpec> =>
    (await loadOpenApiPair(isPublic)).bot,
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

export async function loadBotOpenApiOrNull() {
  try {
    return { spec: await loadBotOpenApi() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAPI fetch failed";
    console.error("[docs] Docs chat catalog unavailable:", message);
    return { spec: null, error: message };
  }
}
