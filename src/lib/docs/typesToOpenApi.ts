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

type Field = {
  name: string;
  optional: boolean;
  type: string;
};

function skipSpace(source: string, index: number) {
  while (index < source.length && /\s/.test(source[index] ?? "")) {
    index += 1;
  }
  return index;
}

function matchingBrace(source: string, open: number) {
  if (source[open] !== "{") {
    throw new Error(`Expected "{" at index ${open}`);
  }

  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error("Unbalanced braces in generated database types");
}

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function extractTypeObject(source: string, typeName: string) {
  const match = source.match(
    new RegExp(`export\\s+type\\s+${typeName}\\s*=\\s*\\{`),
  );
  if (!match || match.index == null) {
    throw new Error(`Missing export type ${typeName}`);
  }

  const open = source.indexOf("{", match.index);
  return source.slice(open + 1, matchingBrace(source, open));
}

function extractNamedObject(body: string, key: string) {
  const match = body.match(new RegExp(`(?:^|[\\s;])${key}\\s*:\\s*\\{`));
  if (!match || match.index == null) {
    return null;
  }

  const open = body.indexOf("{", match.index);
  return body.slice(open + 1, matchingBrace(body, open));
}

function parseNamedBlocks(body: string) {
  const blocks: { name: string; inner: string }[] = [];
  let index = 0;

  while (index < body.length) {
    index = skipSpace(body, index);
    if (index >= body.length) {
      break;
    }

    const rest = body.slice(index);
    const nameMatch = rest.match(/^([A-Za-z_][\w]*)\s*:/);
    if (!nameMatch) {
      index += 1;
      continue;
    }

    index += nameMatch[0].length;
    index = skipSpace(body, index);
    if (body[index] !== "{") {
      while (index < body.length && body[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    const close = matchingBrace(body, index);
    blocks.push({ name: nameMatch[1], inner: body.slice(index + 1, close) });
    index = close + 1;
  }

  return blocks;
}

function splitTopLevel(type: string, delimiter: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < type.length; index += 1) {
    const char = type[index];
    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
    } else if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
    } else if (char === delimiter && depth === 0) {
      parts.push(type.slice(start, index).trim());
      start = index + delimiter.length;
    }
  }

  parts.push(type.slice(start).trim());
  return parts.filter(Boolean);
}

function parseFields(inner: string): Field[] {
  const fields: Field[] = [];
  let index = 0;

  while (index < inner.length) {
    index = skipSpace(inner, index);
    if (index >= inner.length) {
      break;
    }

    const rest = inner.slice(index);
    const fieldMatch = rest.match(/^([A-Za-z_][\w]*)(\?)?\s*:/);
    if (!fieldMatch) {
      index += 1;
      continue;
    }

    index += fieldMatch[0].length;
    index = skipSpace(inner, index);

    let typeEnd = index;
    let depth = 0;
    while (typeEnd < inner.length) {
      const char = inner[typeEnd];
      if (char === "{") {
        typeEnd = matchingBrace(inner, typeEnd) + 1;
        continue;
      }
      if (char === "(" || char === "[") {
        depth += 1;
      } else if (char === ")" || char === "]") {
        depth -= 1;
      } else if ((char === ";" || char === "," || char === "\n") && depth <= 0) {
        break;
      }
      typeEnd += 1;
    }

    const type = inner.slice(index, typeEnd).trim().replace(/[;,]$/, "");
    if (type && type !== "never") {
      fields.push({
        name: fieldMatch[1],
        optional: Boolean(fieldMatch[2]),
        type,
      });
    }

    index = typeEnd + 1;
  }

  return fields;
}

function parseFunction(inner: string) {
  const argsMatch = inner.match(/Args\s*:\s*/);
  const returnsMatch = inner.match(/Returns\s*:\s*/);
  if (!argsMatch || argsMatch.index == null || !returnsMatch || returnsMatch.index == null) {
    throw new Error("Function block is missing Args or Returns");
  }

  const argsStart = argsMatch.index + argsMatch[0].length;
  const argsText = inner.slice(argsStart, returnsMatch.index).trim().replace(/;+$/, "");
  const returnsText = inner.slice(returnsMatch.index + returnsMatch[0].length).trim().replace(/;+$/, "");

  return { argsText, returnsText };
}

function pascalCase(name: string) {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join("");
}

function schemaName(resource: string, kind: "Row" | "Insert" | "Update" | "Args") {
  return `${pascalCase(resource)}${kind}`;
}

function tsTypeToSchema(type: string): JsonSchema {
  const trimmed = type.trim();
  if (trimmed === "Json") {
    return {
      description: "JSON value",
      additionalProperties: true,
    };
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return fieldsToSchema(parseFields(trimmed.slice(1, -1)));
  }

  const union = splitTopLevel(trimmed, "|").map((part) => part.trim());
  const nullable = union.includes("null");
  const rest = union.filter((part) => part !== "null");
  const primary = rest[0] ?? "object";

  let schema: JsonSchema;
  if (primary === "string") {
    schema = { type: "string" };
  } else if (primary === "number") {
    schema = { type: "number" };
  } else if (primary === "boolean") {
    schema = { type: "boolean" };
  } else if (primary === "Json") {
    schema = tsTypeToSchema("Json");
  } else if (primary.endsWith("[]")) {
    schema = {
      type: "array",
      items: tsTypeToSchema(primary.slice(0, -2).trim()),
    };
  } else {
    schema = { type: "object", additionalProperties: true, description: primary };
  }

  if (nullable) {
    schema.type = Array.isArray(schema.type)
      ? [...schema.type, "null"]
      : schema.type
        ? [schema.type, "null"]
        : ["object", "null"];
  }

  return schema;
}

function fieldsToSchema(fields: Field[]): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name] = tsTypeToSchema(field.type);
    if (!field.optional) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    additionalProperties: false,
    ...(required.length > 0 ? { required } : {}),
  };
}

function refSchema(name: string): JsonSchema {
  return { $ref: `#/components/schemas/${name}` };
}

function jsonContent(schema: JsonSchema) {
  return { "application/json": { schema } };
}

function operation(
  operationId: string,
  tags: string[],
  summary: string,
  extras: Partial<OpenApiOperation> = {},
): OpenApiOperation {
  return {
    operationId,
    tags,
    summary,
    responses: extras.responses ?? {
      "200": { description: "OK" },
    },
    ...(extras.requestBody ? { requestBody: extras.requestBody } : {}),
  };
}

function resourceOperations(options: {
  name: string;
  hasInsert: boolean;
  hasUpdate: boolean;
  row: string;
  insert?: string;
  update?: string;
}) {
  const pathItem: Record<string, OpenApiOperation> = {
    get: operation(`get${pascalCase(options.name)}`, [options.name], `List ${options.name}`, {
      responses: {
        "200": {
          description: `Rows from ${options.name}`,
          content: jsonContent({
            type: "array",
            items: refSchema(options.row),
          }),
        },
      },
    }),
  };

  if (options.hasInsert && options.insert) {
    pathItem.post = operation(
      `create${pascalCase(options.name)}`,
      [options.name],
      `Insert ${options.name}`,
      {
        requestBody: {
          required: true,
          content: jsonContent(refSchema(options.insert)),
        },
        responses: {
          "201": {
            description: `Created ${options.name} rows`,
            content: jsonContent({
              type: "array",
              items: refSchema(options.row),
            }),
          },
        },
      },
    );
  }

  if (options.hasUpdate && options.update) {
    pathItem.patch = operation(
      `update${pascalCase(options.name)}`,
      [options.name],
      `Update ${options.name}`,
      {
        requestBody: {
          required: true,
          content: jsonContent(refSchema(options.update)),
        },
        responses: {
          "200": {
            description: `Updated ${options.name} rows`,
            content: jsonContent({
              type: "array",
              items: refSchema(options.row),
            }),
          },
        },
      },
    );
  }

  if (options.hasInsert || options.hasUpdate) {
    pathItem.delete = operation(
      `delete${pascalCase(options.name)}`,
      [options.name],
      `Delete ${options.name}`,
      {
        responses: {
          "204": { description: `Deleted ${options.name} rows` },
        },
      },
    );
  }

  return pathItem;
}

export function typesToOpenApi(
  source: string,
  options: { title: string; description: string },
): OpenApiSpec {
  const cleaned = stripComments(source);
  const database = extractTypeObject(cleaned, "Database");
  const publicSchema = extractNamedObject(database, "public");
  if (!publicSchema) {
    throw new Error("Generated database types are missing public schema");
  }

  const tablesBody = extractNamedObject(publicSchema, "Tables") ?? "";
  const viewsBody = extractNamedObject(publicSchema, "Views") ?? "";
  const functionsBody = extractNamedObject(publicSchema, "Functions") ?? "";

  const schemas: Record<string, JsonSchema> = {};
  const paths: NonNullable<OpenApiSpec["paths"]> = {};
  const tags = new Map<string, { name: string }>();

  function addTag(name: string) {
    if (!tags.has(name)) {
      tags.set(name, { name });
    }
  }

  for (const block of [...parseNamedBlocks(tablesBody), ...parseNamedBlocks(viewsBody)]) {
    const rowInner = extractNamedObject(block.inner, "Row");
    if (!rowInner) {
      continue;
    }

    const insertInner = extractNamedObject(block.inner, "Insert");
    const updateInner = extractNamedObject(block.inner, "Update");
    const rowName = schemaName(block.name, "Row");
    const insertName = schemaName(block.name, "Insert");
    const updateName = schemaName(block.name, "Update");

    schemas[rowName] = fieldsToSchema(parseFields(rowInner));
    if (insertInner) {
      schemas[insertName] = fieldsToSchema(parseFields(insertInner));
    }
    if (updateInner) {
      schemas[updateName] = fieldsToSchema(parseFields(updateInner));
    }

    addTag(block.name);
    paths[`/${block.name}`] = resourceOperations({
      name: block.name,
      hasInsert: Boolean(insertInner),
      hasUpdate: Boolean(updateInner),
      row: rowName,
      insert: insertInner ? insertName : undefined,
      update: updateInner ? updateName : undefined,
    });
  }

  for (const block of parseNamedBlocks(functionsBody)) {
    const { argsText, returnsText } = parseFunction(block.inner);
    const argsName = schemaName(block.name, "Args");
    const argsSchema =
      argsText === "never"
        ? { type: "object" as const, additionalProperties: false }
        : tsTypeToSchema(argsText);
    schemas[argsName] = argsSchema;
    addTag("rpc");

    const hasArgs = argsText !== "never";
    paths[`/rpc/${block.name}`] = {
      post: operation(
        `rpc${pascalCase(block.name)}`,
        ["rpc"],
        `Call ${block.name}`,
        {
          ...(hasArgs
            ? {
                requestBody: {
                  required: true,
                  content: jsonContent(refSchema(argsName)),
                },
              }
            : {}),
          responses: {
            "200": {
              description: `Result of ${block.name}`,
              content: jsonContent(tsTypeToSchema(returnsText)),
            },
          },
        },
      ),
    };
  }

  applyOperationSecurity(paths);

  return {
    openapi: "3.1.0",
    info: {
      title: options.title,
      version: "1.0.0",
      description: options.description,
    },
    tags: [...tags.values()],
    security: [{ apikey: [] }],
    paths,
    components: {
      schemas,
      securitySchemes: {
        apikey: {
          type: "apiKey",
          in: "header",
          name: "apikey",
          description:
            "Supabase anon (publishable) key. Required on every Data API call.",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Supabase user JWT for authenticated admin calls. Anon-callable operations do not require this.",
        },
      },
    },
  };
}
