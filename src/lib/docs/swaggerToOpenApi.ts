type JsonMap = Record<string, unknown>;

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

function isMap(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rewriteRefs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(rewriteRefs);
  }
  if (!isMap(value)) {
    return value;
  }

  const next: JsonMap = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === "$ref" && typeof nested === "string") {
      next[key] = nested
        .replace(/^#\/definitions\//, "#/components/schemas/")
        .replace(/^#\/parameters\//, "#/components/parameters/");
    } else {
      next[key] = rewriteRefs(nested);
    }
  }
  return next;
}

function paramRefName(parameter: unknown): string | null {
  if (!isMap(parameter) || typeof parameter.$ref !== "string") {
    return null;
  }
  const match = parameter.$ref.match(/#\/(?:components\/)?parameters\/(.+)$/);
  return match?.[1] ?? null;
}

function omitParameterSchemaFields(parameter: JsonMap): JsonMap {
  const rest = { ...parameter };
  delete rest.type;
  delete rest.format;
  delete rest.enum;
  delete rest.default;
  delete rest.items;
  return rest;
}

function toOasParameter(parameter: JsonMap): JsonMap {
  if (isMap(parameter.schema)) {
    return omitParameterSchemaFields(parameter);
  }

  const { type, format, enum: enumValues, default: defaultValue, items, ...rest } = parameter;
  const schema: JsonMap = {};
  if (type !== undefined) schema.type = type;
  if (format !== undefined) schema.format = format;
  if (enumValues !== undefined) schema.enum = enumValues;
  if (defaultValue !== undefined) schema.default = defaultValue;
  if (items !== undefined) schema.items = items;
  return { ...rest, ...(Object.keys(schema).length > 0 ? { schema } : {}) };
}

function toRequestBody(parameter: JsonMap): JsonMap {
  return {
    required: Boolean(parameter.required),
    content: {
      "application/json": {
        schema: parameter.schema ?? { type: "object" },
      },
    },
  };
}

function convertResponse(response: unknown): unknown {
  if (!isMap(response) || typeof response.$ref === "string") {
    return response;
  }

  const { schema, examples, ...rest } = response;
  if (!isMap(schema) && schema === undefined) {
    return rest;
  }

  const media: JsonMap = {};
  if (isMap(schema) || schema !== undefined) {
    media.schema = schema;
  }
  if (examples !== undefined) {
    media.examples = examples;
  }

  return {
    ...rest,
    content: {
      "application/json": media,
    },
  };
}

function convertResponses(operation: JsonMap) {
  if (!isMap(operation.responses)) {
    return;
  }
  const next: JsonMap = {};
  for (const [status, response] of Object.entries(operation.responses)) {
    next[status] = convertResponse(response);
  }
  operation.responses = next;
}

function convertOperation(operation: JsonMap, swaggerParameters: JsonMap) {
  const list = Array.isArray(operation.parameters) ? operation.parameters : [];
  const kept: unknown[] = [];
  let requestBody: JsonMap | undefined;

  for (const parameter of list) {
    const name = paramRefName(parameter);
    const resolved = name && isMap(swaggerParameters[name])
      ? swaggerParameters[name]
      : isMap(parameter)
        ? parameter
        : null;
    const isBody =
      resolved?.in === "body" || Boolean(name?.startsWith("body."));

    if (isBody && resolved) {
      requestBody = toRequestBody(resolved);
      continue;
    }
    if (isMap(parameter) && typeof parameter.$ref !== "string") {
      kept.push(toOasParameter(parameter));
    } else {
      kept.push(parameter);
    }
  }

  if (kept.length > 0) {
    operation.parameters = kept;
  } else {
    delete operation.parameters;
  }
  if (requestBody) {
    operation.requestBody = requestBody;
  }
  convertResponses(operation);
  delete operation.consumes;
  delete operation.produces;
}

function convertPathItem(item: JsonMap, swaggerParameters: JsonMap) {
  if (Array.isArray(item.parameters)) {
    const dummy: JsonMap = { parameters: item.parameters };
    convertOperation(dummy, swaggerParameters);
    if (dummy.parameters) {
      item.parameters = dummy.parameters;
    } else {
      delete item.parameters;
    }
    if (dummy.requestBody) {
      item.requestBody = dummy.requestBody;
    }
  }

  for (const [method, operation] of Object.entries(item)) {
    if (!HTTP_METHODS.has(method) || !isMap(operation)) {
      continue;
    }
    convertOperation(operation, swaggerParameters);
  }
}

/** PostgREST still publishes Swagger 2.0. Scalar only sends `Authorization: Bearer` for OAS3 http bearer. */
export function swagger2ToOpenApi31(spec: JsonMap): JsonMap {
  const clone = rewriteRefs(JSON.parse(JSON.stringify(spec))) as JsonMap;
  if (typeof clone.openapi === "string") {
    return clone;
  }

  const swaggerParameters = isMap(clone.parameters) ? clone.parameters : {};
  const definitions = isMap(clone.definitions) ? clone.definitions : {};
  const paths = isMap(clone.paths) ? clone.paths : {};

  const oasParameters: JsonMap = {};
  for (const [name, parameter] of Object.entries(swaggerParameters)) {
    if (!isMap(parameter) || parameter.in === "body" || name.startsWith("body.")) {
      continue;
    }
    oasParameters[name] = toOasParameter(parameter);
  }

  for (const item of Object.values(paths)) {
    if (isMap(item)) {
      convertPathItem(item, swaggerParameters);
    }
  }

  const converted: JsonMap = {
    openapi: "3.1.0",
    info: clone.info ?? { title: "API", version: "1.0.0" },
    paths,
    components: {
      schemas: definitions,
      ...(Object.keys(oasParameters).length > 0
        ? { parameters: oasParameters }
        : {}),
    },
  };

  if (Array.isArray(clone.tags)) {
    converted.tags = clone.tags;
  }

  return converted;
}
