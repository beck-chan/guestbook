export type JsonSchema = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  nullable?: boolean;
  example?: unknown;
  default?: unknown;
  $ref?: string;
};

export type OpenApiSecurityRequirement = Record<string, string[]>;

export type OpenApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  example?: unknown;
  schema?: JsonSchema;
  $ref?: string;
};

export type OpenApiOperation = {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  security?: OpenApiSecurityRequirement[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: {
      "application/json"?: {
        schema?: JsonSchema;
        example?: unknown;
        examples?: Record<string, { summary?: string; value?: unknown }>;
      };
    };
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: {
        "application/json"?: { schema?: JsonSchema };
      };
    }
  >;
};

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

export type OpenApiNavItem = {
  label: string;
  method: string;
  href: string;
};

export type OpenApiNavSection = {
  title: string;
  href: string;
  items: OpenApiNavItem[];
};

export type OpenApiSpec = {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  host?: string;
  basePath?: string;
  schemes?: string[];
  servers?: {
    url: string;
    description?: string;
    variables?: Record<
      string,
      { default: string; description?: string; enum?: string[] }
    >;
  }[];
  tags?: { name: string; description?: string }[];
  security?: OpenApiSecurityRequirement[];
  paths?: Record<string, Record<string, OpenApiOperation | undefined> | undefined>;
  definitions?: Record<string, JsonSchema>;
  securityDefinitions?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, JsonSchema>;
    securitySchemes?: Record<string, unknown> & {
      apikey?: {
        type: "apiKey";
        in: "header";
        name: string;
        description?: string;
      };
      bearerAuth?: {
        type: "http";
        scheme: "bearer";
        bearerFormat?: string;
        description?: string;
      };
    };
  };
};

const ANON_OPERATIONS = new Set([
  "POST /comments",
  "GET /comments_public",
  "GET /guestbook_settings",
  "GET /poem_heart_counts",
  "GET /poem_heart_total",
  "POST /rpc/toggle_poem_heart",
  "POST /rpc/poem_heart_state",
]);

const API_KEY_SECURITY: OpenApiSecurityRequirement[] = [{ apikey: [] }];
const API_KEY_AND_BEARER: OpenApiSecurityRequirement[] = [
  { apikey: [], bearerAuth: [] },
];

export function applyOperationSecurity(paths: OpenApiSpec["paths"]) {
  if (!paths) {
    return;
  }

  for (const [path, methods] of Object.entries(paths)) {
    if (!methods) {
      continue;
    }
    for (const [method, operationItem] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !operationItem) {
        continue;
      }
      const key = `${method.toUpperCase()} ${path}`;
      operationItem.security = ANON_OPERATIONS.has(key)
        ? API_KEY_SECURITY
        : API_KEY_AND_BEARER;
    }
  }
}

function tagForPath(path: string, operation: OpenApiOperation) {
  if (operation.tags?.[0]) {
    return operation.tags[0];
  }
  if (path.startsWith("/rpc/")) {
    return "rpc";
  }
  return path.split("/").filter(Boolean)[0] ?? "other";
}

function tagDescriptionKeyNav(name: string) {
  return name.trim().toLowerCase().replace(/^\(rpc\)\s+/, "");
}

const HIDDEN_API_RPCS = new Set(["rls_auto_enable", "hook_before_user_created"]);

function scalarNavSlug(value: string) {
  return value
    .slice(0, 255)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function openApiNav(spec: OpenApiSpec): OpenApiNavSection[] {
  const byTag = new Map<string, OpenApiNavItem[]>();

  for (const tag of spec.tags ?? []) {
    if (tag?.name) {
      byTag.set(tag.name, []);
    }
  }

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    if (!methods || path === "/" || path === "") {
      continue;
    }
    for (const [method, operationItem] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !operationItem) {
        continue;
      }
      const tag = tagForPath(path, operationItem);
      if (
        tag.toLowerCase() === "introspection" ||
        HIDDEN_API_RPCS.has(tagDescriptionKeyNav(tag)) ||
        HIDDEN_API_RPCS.has(path.replace(/^\/rpc\//i, "").toLowerCase())
      ) {
        continue;
      }
      const list = byTag.get(tag) ?? [];
      const verb = method.toUpperCase();
      list.push({
        label: operationItem.summary || `${verb} ${path}`,
        method: verb,
        href: `#api/tag/${scalarNavSlug(tag)}/${verb}${path}`,
      });
      byTag.set(tag, list);
    }
  }

  return [...byTag.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => ({
      title,
      href: `#api/tag/${scalarNavSlug(title)}`,
      items,
    }));
}
