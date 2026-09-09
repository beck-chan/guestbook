import "server-only";

import fs from "node:fs";
import path from "node:path";
import { flags } from "@/lib/flags";
import { typesToOpenApi, type OpenApiSpec } from "./typesToOpenApi";
import { envSupabaseProjectRef, publicApiServers } from "./publicApiServers";

const API_DIR = path.join(process.cwd(), "src/app/docs/api");
const PAIR_FILES = ["database.types.ts", "database.types-public.ts"] as const;

export function assertDatabaseTypesPair() {
  for (const name of PAIR_FILES) {
    const resolved = path.join(API_DIR, name);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Docs API types file missing: ${name}`);
    }
  }
}

export function resolveDatabaseTypesPath(isPublic = flags.public) {
  assertDatabaseTypesPair();
  return path.join(
    API_DIR,
    isPublic ? "database.types-public.ts" : "database.types.ts",
  );
}

export function loadDatabaseOpenApi(isPublic = flags.public): OpenApiSpec {
  const file = resolveDatabaseTypesPath(isPublic);
  const source = fs.readFileSync(file, "utf8");
  const spec = typesToOpenApi(source, {
    title: isPublic
      ? "y2k Guestbook API"
      : "Beck's y2k Guestbook API",
    description: isPublic
      ? "### The API below reflects the calls you can make to your connected Supabase database when the guestbook is fully installed.<br></br>\n\n> To hook up the Test Request functionality to your instance of Supabase, you'll need to [enter your Project ID above](#enter-supabase-connection-details) and [your admin auth token](#retrieve-admin-auth-token) as your JWT (**Auth Type**: `bearerAuth`, Bearer Token) under **Authentication**.\n\n<br>Project IDs and keys you enter on this page when testing requests stay in your browser — we do not collect them. Send goes from your browser direct to your Supabase project."
      : flags.apiTest
        ? "### The API below reflects the functionality of Beck's custom guestbook install.<br></br>\n\n> Testing functionality is turned on, and uses this project's Supabase URL from the environment."
        : "### The API below reflects the functionality of Beck's custom guestbook install.\n\n<br>You cannot enter API keys or project IDs for testing.<br>\n\n> [View Public API Library](https://y2k-guestbook.vercel.app/docs/api)",
  });

  if (isPublic) {
    spec.servers = publicApiServers();
  } else if (flags.apiTest) {
    spec.servers = publicApiServers(envSupabaseProjectRef());
  }

  return spec;
}
