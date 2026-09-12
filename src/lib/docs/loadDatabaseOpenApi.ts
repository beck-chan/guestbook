import "server-only";

import { cache } from "react";
import { flags } from "@/lib/flags";
import {
  applyOperationSecurity,
  type OpenApiSpec,
} from "./typesToOpenApi";
import { swagger2ToOpenApi31 } from "./swaggerToOpenApi";
import { envSupabaseProjectRef, publicApiServers } from "./publicApiServers";

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

function overlayInfo(spec: OpenApiSpec, isPublic: boolean) {
  spec.info = {
    ...spec.info,
    title: isPublic ? "y2k Guestbook API" : "Beck's y2k Guestbook API",
    version: spec.info?.version ?? "1.0.0",
    description: isPublic
      ? "### The API below reflects the calls you can make to your connected Supabase database when the guestbook is fully installed.<br></br>\n\n> To hook up the Test Request functionality to your instance of Supabase, you'll need to [enter your Project ID above](#enter-supabase-connection-details) and [your admin auth token](#retrieve-admin-auth-token) as your JWT (**Auth Type**: `bearerAuth`, Bearer Token) under **Authentication**.\n\n<br>Project IDs and keys you enter on this page when testing requests stay in your browser — we do not collect them. Send goes from your browser direct to your Supabase project."
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
  overlayInfo(normalized, isPublic);
  normalized.components = normalized.components ?? {};
  normalized.components.securitySchemes = {
    ...normalized.components.securitySchemes,
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
